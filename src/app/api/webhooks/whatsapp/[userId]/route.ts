
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import { getWhatsAppCredentials, downloadMediaAsDataUri, sendWhatsAppMessage } from '@/lib/whatsapp';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This function is triggered to process messages in the background
async function processMessageAsync(userId: string, message: any, contact: any) {
    const from = message.from;
    const profileName = contact?.profile?.name;
    
    try {
        // Step 1: Store the message and get necessary info for AI
        const { messageId, contentForAi } = await storeInitialMessage(userId, from, message, profileName);
        console.log(`✅ Message ${messageId} stored. Content for AI: "${contentForAi}"`);

        // Step 2: Check if AI should respond
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        if (!userSettingsDoc.exists) {
            console.log("🤖 User settings not found. Cannot check for AI status.");
            return;
        }
        const settings = userSettingsDoc.data() || {};
        
        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(from).get();
        const isChatAiEnabled = conversationDoc.exists && conversationDoc.data()?.isAiEnabled !== false;

        // Step 3: If AI is enabled, generate and send a response
        if (isGlobalAiEnabled && isChatAiEnabled) {
            console.log('🤖 AI is enabled for this chat. Generating response...');
            
            // CRITICAL FIX: Ensure AI settings (apiKey and model) exist before proceeding.
            if (!settings.ai || !settings.ai.apiKey || !settings.ai.model) {
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

            try {
                 // Correctly initialize Genkit with the user's specific API key and model
                const googleAIPlugin = googleAI({ apiKey: settings.ai.apiKey });
                const modelName = `googleai/${settings.ai.model}`;
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
                    console.log(`✅ AI response sent successfully to ${from}.`);
                } else {
                    console.log(`🤖 AI generated an empty response. Not sending.`);
                }
            } catch (aiError: any) {
                console.error("🔴🔴🔴 FAILED TO GENERATE OR SEND AI RESPONSE 🔴🔴🔴");
                console.error(aiError);
            }

        } else {
            console.log('🤖 AI is disabled for this user or chat. No response will be sent.');
        }

        // Step 4: Handle media processing in the background (fire and forget)
        if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.type)) {
            processMediaInBackground(userId, from, message, messageId).catch(err => {
                console.error("🔴 Background media processing failed:", err);
            });
        }

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message from ${from}:`, error);
    }
}


/**
 * Handles webhook verification from Meta.
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

        if (!value || (!value.messages && !value.statuses)) {
             console.log("Discarding: Event is not a message or status update.");
             return NextResponse.json({ status: 'not a message or status update' }, { status: 200 });
        }
        
        // Handle incoming messages
        if (value.messages) {
            const message = value.messages[0];
            const contact = value.contacts?.[0];
            
            // Schedule the message processing to run in the background
            processMessageAsync(userId, message, contact);
        }

        // Handle message status updates (e.g., delivered, read)
        if (value.statuses) {
            // Optional: You can add logic here to update message status in your DB
            console.log(`Received status update: ${JSON.stringify(value.statuses[0])}`);
        }

        // Return a 200 OK response immediately to Meta
        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}


/**
 * Stores the initial message in Firestore.
 */
async function storeInitialMessage(userId: string, conversationId: string, message: any, profileName?: string): Promise<{ messageId: string, contentForAi: string }> {
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
      messageToStore.media = { id: message[mediaType].id, mime_type: message[mediaType].mime_type };
      
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

  return { messageId: messageRef.id, contentForAi: incomingMessageContent };
}

/**
 * Downloads and updates a media message in the background.
 */
async function processMediaInBackground(userId: string, conversationId: string, message: any, messageId: string) {
    console.log(`[Media BG] Starting download for message ${messageId}...`);
    try {
        const { accessToken } = await getWhatsAppCredentials(userId, ['accessToken']);
        const mediaId = message[message.type].id;
        const { dataUri, mimeType } = await downloadMediaAsDataUri(mediaId, accessToken);
        
        const messageRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages').doc(messageId);
        
        await messageRef.update({
            'mediaUrl': dataUri,
            'mimeType': mimeType,
            'status': 'processed',
        });
        console.log(`[Media BG] ✅ Successfully processed and updated media for message ${messageId}.`);

    } catch (error) {
        console.error(`[Media BG] 🔴 Failed to process media for message ${messageId}:`, error);
        const messageRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages').doc(messageId);
        await messageRef.update({ 'status': 'failed_processing' });
    }
}
