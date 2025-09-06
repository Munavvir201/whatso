
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import axios from 'axios';
import * as admin from 'firebase-admin';

// Helper function to get a document reference from Firestore
const getDocRef = (path: string) => db.doc(path);

// Fetches a document's data from Firestore
async function getDocument(ref: admin.firestore.DocumentReference) {
  const docSnap = await ref.get();
  if (!docSnap.exists) {
    throw new Error(`Document does not exist at path: ${ref.path}`);
  }
  return docSnap.data();
}

async function getWhatsAppCredentials(userId: string) {
    const userSettingsRef = getDocRef(`userSettings/${userId}`);
    const userData = await getDocument(userSettingsRef);

    if (!userData || !userData.whatsapp) {
        throw new Error("WhatsApp credentials not configured for this user.");
    }
    const { phoneNumberId, accessToken, webhookSecret } = userData.whatsapp;
    if (!phoneNumberId || !accessToken || !webhookSecret) {
        throw new Error("Missing Phone Number ID, Access Token, or Webhook Secret.");
    }
    return { phoneNumberId, accessToken, webhookSecret };
}

/**
 * Handles webhook verification from Meta.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log(`--- Webhook Verification for User: ${userId} ---`);
  console.log(`Received query params: mode=${mode}, token=${token}, challenge=${challenge}`);


  if (mode !== 'subscribe' || !token || !challenge) {
    console.error('🔴 Verification FAILED: Missing or invalid parameters.');
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
  }

  try {
    const { webhookSecret: storedToken } = await getWhatsAppCredentials(userId);
    
    console.log(`Received Token from Meta: "${token}"`);
    console.log(`Stored Token in DB:     "${storedToken}"`);


    if (token === storedToken) {
      console.log(`✅ Verification SUCCESS: Tokens match.`);
      const userSettingsRef = db.collection('userSettings').doc(userId);
      await userSettingsRef.set({ whatsapp: { status: 'verified' } }, { merge: true });
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      console.error(`🔴 Verification FAILED: Token mismatch.`);
      return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
    }
  } catch (error: any) {
    console.error('🔴 UNEXPECTED ERROR during verification:', error);
    if (error.message.includes("not configured") || error.message.includes("does not exist")) {
         return NextResponse.json({ error: 'User settings or webhook secret not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handles incoming messages from WhatsApp.
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;
    
    try {
        const body = await req.json();
        console.log('--- New WhatsApp Message Received ---', JSON.stringify(body, null, 2));

        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (body.object !== 'whatsapp_business_account' || !message) {
            console.log('Discarding: Not a valid WhatsApp message payload.');
            return NextResponse.json({ status: 'not a valid whatsapp message' }, { status: 200 });
        }

        processMessageAsync(userId, message).catch(err => {
            console.error("Error in async message processing:", err);
        });

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

/**
 * Sends a message via the WhatsApp API and stores it in Firestore.
 */
async function sendWhatsAppMessage(userId: string, to: string, message: string) {
    console.log(`Attempting to send message to ${to} for user ${userId}`);
    const { phoneNumberId, accessToken } = await getWhatsAppCredentials(userId);

    const response = await axios.post(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: message },
    }, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    console.log('✅ Message sent successfully via API, now storing in DB.');

    await storeMessage(userId, to, {
        sender: 'agent',
        content: message,
        timestamp: FieldValue.serverTimestamp(),
        type: 'text',
        whatsappMessageId: response.data.messages[0].id
    });
    
    return response.data;
}


/**
 * Downloads media from Meta's servers and returns it as a base64 data URI.
 */
async function downloadMediaAsDataUri(mediaId: string, accessToken: string): Promise<{ dataUri: string, mimeType: string }> {
    // 1. Get media URL
    const urlResponse = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const mediaUrl = urlResponse.data.url;
    
    // 2. Download the actual media file
    const downloadResponse = await axios.get(mediaUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        responseType: 'arraybuffer'
    });

    const mimeType = downloadResponse.headers['content-type'];
    const base64Data = Buffer.from(downloadResponse.data, 'binary').toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    return { dataUri, mimeType };
}


/**
 * Processes an incoming WhatsApp message: stores it, generates an AI response,
 * sends the response, and stores the response.
 */
async function processMessageAsync(userId: string, message: any) {
    const from = message.from; // Customer's phone number
    const conversationId = from; // Use customer's number as the unique ID for the conversation
    const { accessToken } = await getWhatsAppCredentials(userId);

    const messageToStore: any = {
        sender: 'customer',
        timestamp: FieldValue.serverTimestamp(),
        whatsappMessageId: message.id,
        type: message.type
    };
    
    let incomingMessageContent = "";

    switch (message.type) {
        case 'text':
            messageToStore.content = message.text.body;
            incomingMessageContent = message.text.body;
            break;
        case 'image':
        case 'audio':
        case 'video':
        case 'document':
        case 'sticker':
            const mediaType = message.type;
            const mediaId = message[mediaType].id;
            try {
                const { dataUri, mimeType } = await downloadMediaAsDataUri(mediaId, accessToken);
                messageToStore.mediaUrl = dataUri;
                messageToStore.mimeType = mimeType;
                incomingMessageContent = `[${mediaType} received]`; // Placeholder for AI
                if (message[mediaType].caption) {
                    messageToStore.caption = message[mediaType].caption;
                    incomingMessageContent += ` with caption: ${message[mediaType].caption}`;
                }
                 if (mediaType === 'document' && message.document.filename) {
                    messageToStore.content = message.document.filename;
                    incomingMessageContent = `[Document: ${message.document.filename}]`
                }
            } catch (error) {
                console.error(`🔴 FAILED to download ${mediaType} with ID ${mediaId}:`, error);
                messageToStore.content = `[Failed to download ${mediaType}]`;
                incomingMessageContent = `[Failed to process incoming ${mediaType}]`;
            }
            break;
        default:
            console.log(`Skipping processing: Unsupported message type '${message.type}'.`);
            return;
    }
    
    try {
        await storeMessage(userId, conversationId, messageToStore);
        console.log(`✅ Stored message from ${from}. Now generating AI response...`);
        
        const conversationHistory = await getConversationHistory(userId, conversationId);
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        const clientData = userSettingsDoc.data()?.trainingData?.clientData || '';

        const aiResult = await automateWhatsAppChat({
            message: incomingMessageContent,
            conversationHistory,
            clientData
        });

        console.log(`🤖 AI Response generated: "${aiResult.response}"`);

        await sendWhatsAppMessage(userId, from, aiResult.response);

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message from ${from}:`, error);
    }
}

/**
 * Stores a single message in a conversation and updates conversation metadata.
 */
async function storeMessage(userId: string, conversationId: string, messageData: any) {
    const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
    
    const batch = db.batch();

    batch.set(conversationRef, {
        lastUpdated: FieldValue.serverTimestamp(),
        lastMessage: messageData.caption || messageData.content || `[${messageData.type}]`,
        customerName: 'Customer ' + conversationId.slice(-4), // Placeholder name
        customerNumber: conversationId,
    }, { merge: true });

    const messagesRef = conversationRef.collection('messages').doc();
    batch.set(messagesRef, messageData);

    await batch.commit();
}


/**
 * Fetches the conversation history from Firestore.
 */
async function getConversationHistory(userId: string, conversationId: string): Promise<string> {
    const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
    const messagesSnap = await messagesRef.orderBy('timestamp', 'asc').limit(20).get();

    if (messagesSnap.empty) {
        return "No previous conversation history.";
    }

    return messagesSnap.docs.map(doc => {
        const data = doc.data();
        const sender = data.sender === 'customer' ? 'Customer' : 'Agent';
        const content = data.content || data.caption || `[${data.type} message]`;
        return `${sender}: ${content}`;
    }).join('\n');
}
