
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import { getWhatsAppCredentials, downloadMediaAsDataUri, sendWhatsAppMessage } from '@/lib/whatsapp';

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
    const { webhookSecret: storedToken } = await getWhatsAppCredentials(userId, ['webhookSecret']);

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
    if (error.message.includes("not configured") || error.message.includes("not found")) {
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
        console.log('--- New WhatsApp Webhook Event Received ---');

        if (body.object !== 'whatsapp_business_account') {
            console.log("Discarding: Not a WhatsApp business account update.");
            return NextResponse.json({ status: 'not a whatsapp business account event' }, { status: 200 });
        }

        const value = body.entry?.[0]?.changes?.[0]?.value;

        if (!value) {
            console.log("Discarding: 'value' object is missing from payload.");
            return NextResponse.json({ status: 'no value object' }, { status: 200 });
        }
        
        if (!value.messages) {
             console.log("Discarding: Event is not a message (e.g., status update, read receipt).");
             return NextResponse.json({ status: 'event is not a message' }, { status: 200 });
        }

        const message = value.messages[0];
        const contact = value.contacts?.[0];
        
        processMessageAsync(userId, message, contact).catch(err => {
            console.error("Error in async message processing:", err);
        });

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}


/**
 * Saves a single message document to the database with a server timestamp.
 */
async function storeMessageInDb(userId: string, conversationId: string, messageData: any) {
  try {
    const messageToSave = {
        ...messageData,
        timestamp: FieldValue.serverTimestamp(),
    };
    await db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages').add(messageToSave);
    console.log(`✅ Message stored in DB for conversation ${conversationId}`);
  } catch (error) {
    console.error(`🔴 FAILED to store message in DB for conversation ${conversationId}:`, error);
    throw error;
  }
}


/**
 * Updates the conversation metadata document (last message, unread count, etc.).
 */
async function updateConversationMetadata(userId: string, conversationId: string, lastMessageSummary: string, profileName?: string) {
  const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
  try {
    const conversationUpdate: any = {
      lastUpdated: FieldValue.serverTimestamp(),
      lastMessage: lastMessageSummary,
      customerNumber: conversationId,
      unreadCount: FieldValue.increment(1)
    };

    if (profileName) {
      conversationUpdate.customerName = profileName;
    }

    await conversationRef.set(conversationUpdate, { merge: true });
    console.log(`✅ Conversation metadata updated for ${conversationId}`);
  } catch (error) {
    console.error(`🔴 FAILED to update conversation metadata for ${conversationId}:`, error);
  }
}


/**
 * Processes an incoming WhatsApp message: stores it, generates an AI response,
 * sends the response, and stores the response.
 */
async function processMessageAsync(userId: string, message: any, contact: any) {
    const from = message.from;
    const profileName = contact?.profile?.name;
    
    try {
        const { accessToken } = await getWhatsAppCredentials(userId, ['accessToken']);
        if (!accessToken) throw new Error("Cannot process message. Missing Access Token.");

        const messageToStore: any = {
            sender: 'customer',
            whatsappMessageId: message.id,
            type: message.type
        };

        let incomingMessageContent = "";
        let lastMessageSummary = "";

        switch (message.type) {
            case 'text':
                messageToStore.content = message.text.body;
                incomingMessageContent = message.text.body;
                lastMessageSummary = message.text.body;
                break;
            case 'image':
            case 'audio':
            case 'video':
            case 'document':
            case 'sticker':
                const mediaType = message.type;
                const mediaId = message[mediaType].id;
                const { dataUri, mimeType } = await downloadMediaAsDataUri(mediaId, accessToken);
                
                messageToStore.mediaUrl = dataUri;
                messageToStore.mimeType = mimeType;
                
                if (message[mediaType].caption) {
                    messageToStore.caption = message[mediaType].caption;
                    incomingMessageContent = `[${mediaType} with caption: ${message[mediaType].caption}]`;
                    lastMessageSummary = `📷 ${message[mediaType].caption}`;
                } else if (mediaType === 'document' && message.document.filename) {
                     messageToStore.content = message.document.filename;
                     incomingMessageContent = `[Document: ${message.document.filename}]`;
                     lastMessageSummary = `📄 ${message.document.filename}`;
                } else {
                     const typeEmojiMap = { image: '📷', audio: '🔊', video: '📹', sticker: '🎨' };
                     lastMessageSummary = `${typeEmojiMap[mediaType as keyof typeof typeEmojiMap] || '📎'} [${mediaType}]`;
                     incomingMessageContent = `[${mediaType} message]`;
                }
                break;
            default:
                messageToStore.content = `[Unsupported message type: ${message.type}]`;
                incomingMessageContent = `[Unsupported message type]`;
                lastMessageSummary = `[Unsupported]`;
        }

        // Follow architecture: Store message first, then update metadata.
        await storeMessageInDb(userId, from, messageToStore);
        await updateConversationMetadata(userId, from, lastMessageSummary, profileName);
        
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        if (userSettingsDoc.data()?.ai?.status === 'verified') {
            console.log('🤖 AI is enabled. Generating response...');
            const conversationHistory = await getConversationHistory(userId, from);
            const clientData = userSettingsDoc.data()?.trainingData?.clientData || '';

            const aiResult = await automateWhatsAppChat({
                message: incomingMessageContent,
                conversationHistory,
                clientData
            });

            console.log(`🤖 AI Response generated: "${aiResult.response}"`);
            await sendWhatsAppMessage(userId, from, { type: 'text', text: { body: aiResult.response } });
        } else {
            console.log('🤖 AI is disabled. No response will be sent.');
        }

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message from ${from}:`, error);
    }
}


/**
 * Fetches the conversation history from Firestore.
 */
async function getConversationHistory(userId: string, conversationId: string): Promise<string> {
    const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
    const messagesSnap = await messagesRef.orderBy('timestamp', 'desc').limit(20).get();

    if (messagesSnap.empty) {
        return "No previous conversation history.";
    }
    
    const orderedDocs = [...messagesSnap.docs].reverse();

    return orderedDocs.map(doc => {
        const data = doc.data();
        const sender = data.sender === 'customer' ? 'Customer' : 'Agent';
        let content;
        if (data.type === 'text') {
            content = data.content;
        } else if (data.caption) {
            content = `[${data.type} with caption: ${data.caption}]`;
        } else if (data.content) {
            content = `[${data.type}: ${data.content}]`
        }
        else {
             content = `[${data.type} message]`;
        }
        return `${sender}: ${content}`;
    }).join('\n');
}
