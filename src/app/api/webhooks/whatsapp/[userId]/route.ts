
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import { getWhatsAppCredentials, downloadMediaAsDataUri, sendWhatsAppMessage } from '@/lib/whatsapp';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GoogleAI } from '@genkit-ai/googleai';

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
        
        // This is a fire-and-forget call. We don't await it so we can return a 200 OK response to Meta immediately.
        processMessageAsync(userId, message, contact).catch(err => {
            console.error("🔴 Error in async message processing:", err);
        });

        // Return a 200 OK response immediately as required by Meta.
        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}


/**
 * Stores the incoming message and triggers media processing if needed.
 * Returns the necessary info for the AI.
 */
async function storeAndProcessMessage(userId: string, conversationId: string, message: any, profileName?: string): Promise<{ messageId: string, contentForAi: string }> {
  const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
  const messageRef = conversationRef.collection('messages').doc();

  const messageToStore: any = {
    sender: 'customer',
    whatsappMessageId: message.id,
    type: message.type,
    timestamp: FieldValue.serverTimestamp(),
    status: 'received',
  };

  let lastMessageSummary = "";
  let incomingMessageContent = "";

  switch (message.type) {
    case 'text':
      messageToStore.content = message.text.body;
      lastMessageSummary = message.text.body;
      incomingMessageContent = message.text.body;
      break;
    
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker':
      const mediaType = message.type;
      messageToStore.status = 'processing';
      
      if (message[mediaType].caption) {
        messageToStore.caption = message[mediaType].caption;
        lastMessageSummary = `📷 ${message[mediaType].caption}`;
        incomingMessageContent = `[${mediaType} with caption: ${message[mediaType].caption}]`;
      } else if (mediaType === 'document' && message.document.filename) {
        messageToStore.content = message.document.filename;
        lastMessageSummary = `📄 ${message.document.filename}`;
        incomingMessageContent = `[Document: ${message.document.filename}]`;
      } else {
        const typeEmojiMap = { image: '📷', audio: '🔊', video: '📹', sticker: '🎨' };
        lastMessageSummary = `${typeEmojiMap[mediaType as keyof typeof typeEmojiMap] || '📎'} [${mediaType}]`;
        incomingMessageContent = `[${mediaType} message]`;
      }
      break;

    default:
      lastMessageSummary = `[Unsupported: ${message.type}]`;
      incomingMessageContent = lastMessageSummary;
      messageToStore.content = lastMessageSummary;
  }

  const batch = db.batch();
  
  const conversationData: any = {
    lastUpdated: FieldValue.serverTimestamp(),
    lastMessage: lastMessageSummary,
    customerNumber: conversationId,
    unreadCount: FieldValue.increment(1),
  };
  if (profileName) {
    conversationData.customerName = profileName;
  }
  
  batch.set(conversationRef, conversationData, { merge: true });
  batch.set(messageRef, messageToStore);
  
  await batch.commit();
  console.log(`✅ Initial message ${messageRef.id} stored for conversation ${conversationId}.`);

  return { messageId: messageRef.id, contentForAi: incomingMessageContent };
}


/**
 * Handles media download and updates the message record in the background.
 */
async function processMediaInBackground(userId: string, conversationId: string, message: any, messageDocId: string) {
    const mediaType = message.type;
    const mediaId = message[mediaType].id;
    
    try {
        const { accessToken } = await getWhatsAppCredentials(userId, ['accessToken']);
        const { dataUri, mimeType } = await downloadMediaAsDataUri(mediaId, accessToken);
        
        const messageRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages').doc(messageDocId);
        
        await messageRef.update({
            mediaUrl: dataUri,
            mimeType: mimeType,
            status: 'processed'
        });

        console.log(`✅ Media processed and updated for message ${messageDocId}.`);
    } catch (error) {
        console.error(`🔴 FAILED to process media for message ${messageDocId}:`, error);
        const messageRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages').doc(messageDocId);
        await messageRef.update({ status: 'failed_processing' });
    }
}

/**
 * The main asynchronous function to process an incoming WhatsApp message.
 */
async function processMessageAsync(userId: string, message: any, contact: any) {
    const from = message.from;
    const profileName = contact?.profile?.name;
    
    try {
        const { messageId, contentForAi } = await storeAndProcessMessage(userId, from, message, profileName);
        
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        if (!userSettingsDoc.exists) {
            console.log("🤖 User settings not found. Cannot check for AI status.");
            return;
        }
        const settings = userSettingsDoc.data() || {};
        
        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(from).get();
        const isChatAiEnabled = conversationDoc.exists && conversationDoc.data()?.isAiEnabled !== false;

        if (isGlobalAiEnabled && isChatAiEnabled) {
            console.log('🤖 AI is enabled for this chat. Generating response...');
            
            // This is the CRITICAL part: we must have the API key and model here.
            if (!settings.ai.apiKey || !settings.ai.model) {
                console.error("🔴 AI settings (apiKey or model) are missing from the user's profile. Cannot generate response.");
                return;
            }

            const trainingContext = settings.trainingData || {};
            const clientData = trainingContext.clientData || "";
            const trainingInstructions = trainingContext.trainingInstructions || "";
            const chatFlow = trainingContext.chatFlow || "";
            
            const fullTrainingData = `
              TRAINING DATA:
              ${clientData}
              
              INSTRUCTIONS:
              ${trainingInstructions}
              
              CHAT FLOW:
              ${chatFlow}
            `.trim();

            const googleAIPlugin = googleAI({ apiKey: settings.ai.apiKey });
            const modelName = `googleai/${settings.ai.model}`;

            // We must explicitly configure a new `ai` object here with the user's specific key.
            const ai = genkit({
                plugins: [googleAIPlugin],
                model: modelName as any,
            });

            const aiResult = await automateWhatsAppChat({
                message: contentForAi,
                conversationHistory: "No history available.", // To-do: Implement history retrieval
                clientData: fullTrainingData,
            });

            if (aiResult.response) {
                console.log(`🤖 AI Response generated: "${aiResult.response}"`);
                await sendWhatsAppMessage(userId, from, { type: 'text', text: { body: aiResult.response } });
            } else {
                 console.log(`🤖 AI generated an empty response. Not sending.`);
            }
        } else {
            console.log('🤖 AI is disabled for this user or chat. No response will be sent.');
        }

        // Handle media in the background AFTER the main logic (including AI response) is done.
        if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.type)) {
            processMediaInBackground(userId, from, message, messageId).catch(err => {
                console.error("🔴 Background media processing failed:", err);
            });
        }

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message from ${from}:`, error);
    }
}

    