
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import { getWhatsAppCredentials, downloadMediaAsDataUri, sendWhatsAppMessage } from '@/lib/whatsapp';
import * as admin from 'firebase-admin';


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
        console.log('--- New WhatsApp Webhook Event Received ---', JSON.stringify(body, null, 2));

        if (body.object !== 'whatsapp_business_account') {
            console.log("Discarding: Not a WhatsApp business account update.");
            return NextResponse.json({ status: 'not a whatsapp business account event' }, { status: 200 });
        }

        const value = body.entry?.[0]?.changes?.[0]?.value;

        // Gracefully handle webhooks that are not messages (e.g., read receipts)
        if (!value || !value.messages) {
             console.log("Discarding: Event is not a message (e.g., status update, read receipt).");
             return NextResponse.json({ status: 'event is not a message' }, { status: 200 });
        }

        const message = value.messages[0];
        const contact = value.contacts?.[0]; // Contacts may not always be present
        
        // Don't await this. Process in the background to respond to Meta quickly.
        processMessageAsync(userId, message, contact).catch(err => {
            console.error("Error in async message processing:", err);
        });

        // Return a 200 OK response to Meta immediately.
        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

/**
 * Processes an incoming WhatsApp message: stores it, generates an AI response,
 * sends the response, and stores the response.
 */
async function processMessageAsync(userId: string, message: any, contact: any) {
    const from = message.from;
    const conversationId = from; // The customer's phone number is the conversation ID
    
    try {
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
                const { dataUri, mimeType } = await downloadMediaAsDataUri(mediaId, accessToken);
                
                messageToStore.mediaUrl = dataUri;
                messageToStore.mimeType = mimeType;
                
                 if (message[mediaType].caption) {
                    messageToStore.caption = message[mediaType].caption;
                    incomingMessageContent += `[${mediaType} with caption: ${message[mediaType].caption}]`;
                }
                
                 if (mediaType === 'document' && message.document.filename) {
                    messageToStore.content = message.document.filename;
                    incomingMessageContent = `[Document: ${message.document.filename}]`
                } else {
                    messageToStore.content = `[${mediaType}]`; // A generic placeholder
                    incomingMessageContent = `[${mediaType} message]`;
                }
                break;
            default:
                console.log(`Skipping unsupported message type '${message.type}'.`);
                messageToStore.content = `[Unsupported message type: ${message.type}]`;
                incomingMessageContent = `[Unsupported message type]`;
        }

        // Store the fully formed message in the database.
        await storeMessage(userId, conversationId, messageToStore, contact?.profile?.name);
        console.log(`✅ Stored message from ${from}. Now checking AI mode...`);
        
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        const aiSettings = userSettingsDoc.data()?.ai;
        const isAiEnabled = aiSettings?.status === 'verified'; // Simplified check

        if (isAiEnabled) {
            console.log('🤖 AI is enabled. Generating response...');
            const conversationHistory = await getConversationHistory(userId, conversationId);
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
        // Optionally send an error message back to the user
        try {
            await sendWhatsAppMessage(userId, from, { type: 'text', text: { body: "Sorry, I encountered an error processing your message. Please try again." } });
        } catch (sendError) {
            console.error(`🔴 Failed to send error message to ${from}:`, sendError);
        }
    }
}


/**
 * Stores a single message in a conversation and updates conversation metadata.
 * This function is now highly optimized to reduce latency.
 */
async function storeMessage(userId: string, conversationId: string, messageData: any, profileName?: string) {
    const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
    const messagesColRef = conversationRef.collection('messages');
    
    const batch = db.batch();

    // This is an "upsert" operation. It will create the document if it doesn't exist,
    // or merge the data if it does. This avoids a separate read operation.
    const conversationUpdate: any = {
        lastUpdated: FieldValue.serverTimestamp(),
        lastMessage: messageData.caption || messageData.content || `[${messageData.type}]`,
        customerNumber: conversationId,
        unreadCount: FieldValue.increment(1) // Atomically increment the unread count.
    };
    
    // If a profile name is provided by the webhook, set it.
    // This will only set the name if the document is being created,
    // or if the name doesn't exist yet, thanks to `merge: true`.
    if (profileName) {
        conversationUpdate.customerName = profileName;
    }

    batch.set(conversationRef, conversationUpdate, { merge: true });

    // Add the new message to the `messages` subcollection.
    const newMessageRef = messagesColRef.doc();
    batch.set(newMessageRef, messageData);

    // Commit the batch. This is a single atomic operation.
    await batch.commit();
    console.log(`✅ Stored message in conversation ${conversationId} for user ${userId}`);
}


/**
 * Fetches the conversation history from Firestore.
 */
async function getConversationHistory(userId: string, conversationId: string): Promise<string> {
    const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
    // Get the most recent 20 messages to provide as context to the AI.
    const messagesSnap = await messagesRef.orderBy('timestamp', 'desc').limit(20).get();

    if (messagesSnap.empty) {
        return "No previous conversation history.";
    }

    // Reverse the array to have the messages in chronological order for the AI
    const orderedDocs = messagesSnap.docs.reverse();

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


