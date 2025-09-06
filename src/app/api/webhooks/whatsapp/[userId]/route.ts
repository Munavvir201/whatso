
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
    const { webhookSecret: storedToken } = await getWhatsAppCredentials(userId, ['webhookSecret']);

    if (!storedToken) {
        throw new Error("Webhook secret is not configured in the database.");
    }
    
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
    
    try {
        const { accessToken } = await getWhatsAppCredentials(userId, ['accessToken']);
        if (!accessToken) throw new Error("Cannot process message. Missing Access Token.");

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
                messageToStore.content = `[Unsupported message type: ${message.type}]`;
                incomingMessageContent = `[Unsupported message type]`;
        }

        await storeMessage(userId, from, messageToStore, contact?.profile?.name);
        console.log(`✅ Stored message from ${from}.`);
        
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
        // Do not send an automated error response to avoid potential loops.
    }
}


/**
 * Atomically stores a message and updates conversation metadata using a transaction.
 */
async function storeMessage(userId: string, conversationId: string, messageData: any, profileName?: string) {
  const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
  const messagesColRef = conversationRef.collection('messages');
  
  try {
    await db.runTransaction(async (transaction) => {
      const convDoc = await transaction.get(conversationRef);

      const conversationUpdate: any = {
        lastUpdated: FieldValue.serverTimestamp(),
        lastMessage: messageData.caption || messageData.content || `[${messageData.type}]`,
        customerNumber: conversationId,
      };

      if (!convDoc.exists) {
        // Conversation is new
        if (profileName) {
            conversationUpdate.customerName = profileName;
        } else {
             conversationUpdate.customerName = `Customer ${conversationId.slice(-4)}`;
        }
        conversationUpdate.unreadCount = 1;
        transaction.set(conversationRef, conversationUpdate);
      } else {
        // Conversation exists, increment unread count
        conversationUpdate.unreadCount = FieldValue.increment(1);
         if (profileName && !convDoc.data()?.customerName) {
            conversationUpdate.customerName = profileName;
        }
        transaction.update(conversationRef, conversationUpdate);
      }

      const newMessageRef = messagesColRef.doc();
      transaction.set(newMessageRef, messageData);
    });

    console.log(`✅ Transaction successful: Stored message in conversation ${conversationId}`);
  } catch (error) {
    console.error(`🔴 Transaction FAILED for conversation ${conversationId}:`, error);
    // Re-throw the error to be caught by the calling function
    throw error;
  }
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
    // Use spread `...` to create a shallow copy before reversing to avoid mutating the original array.
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

    
