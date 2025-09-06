
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import { getWhatsAppCredentials, downloadMediaAsDataUri, sendWhatsAppMessage } from '@/lib/whatsapp';

/**
 * Handles webhook verification from Meta. This confirms that we own the endpoint.
 */
export async function GET(req: NextRequest, { params }: { params: { userId:string } }) {
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
      // Mark the user's WhatsApp setup as verified in the database
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
 * Atomically saves a message and updates conversation metadata in a single transaction.
 * This is the most robust way to ensure data consistency.
 */
async function storeMessageInDb(userId: string, conversationId: string, messageData: any, lastMessageSummary: string, profileName?: string) {
  const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
  const messageRef = conversationRef.collection('messages').doc(); // Create a new document reference for the message

  try {
    const batch = db.batch();

    // 1. Create or update the conversation metadata
    const conversationUpdate: any = {
      lastUpdated: FieldValue.serverTimestamp(),
      lastMessage: lastMessageSummary,
      customerNumber: conversationId,
      unreadCount: FieldValue.increment(1),
    };
    if (profileName) {
      conversationUpdate.customerName = profileName;
    }
    batch.set(conversationRef, conversationUpdate, { merge: true });

    // 2. Add the new message to the messages subcollection
    const messageToSave = {
        ...messageData,
        timestamp: FieldValue.serverTimestamp(),
    };
    batch.set(messageRef, messageToSave);
    
    // 3. Commit the batch
    await batch.commit();
    console.log(`✅ Batch write successful for conversation ${conversationId}`);

  } catch (error) {
    console.error(`🔴 BATCH WRITE FAILED for conversation ${conversationId}:`, error);
    throw error; // Re-throw to be caught by the main processor
  }
}

/**
 * The main asynchronous function to process an incoming WhatsApp message.
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
                console.log(`Unsupported message type received: ${message.type}`);
                lastMessageSummary = `[Unsupported: ${message.type}]`;
                incomingMessageContent = `[Unsupported message type]`;
                messageToStore.content = lastMessageSummary;
        }

        // --- Execute the architectural flow ---
        // 1. Atomically store the message and update metadata in one go.
        await storeMessageInDb(userId, from, messageToStore, lastMessageSummary, profileName);
        
        // 2. Check if the AI agent is enabled and then generate a response.
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
            console.log('🤖 AI is disabled for this user. No response will be sent.');
        }

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message from ${from}:`, error);
    }
}

/**
 * Fetches the last 20 messages from a conversation to provide context to the AI.
 */
async function getConversationHistory(userId: string, conversationId: string): Promise<string> {
    const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
    const messagesSnap = await messagesRef.orderBy('timestamp', 'desc').limit(20).get();

    if (messagesSnap.empty) {
        return "No previous conversation history.";
    }
    
    // Safely create a reversed copy of the documents for chronological order.
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
