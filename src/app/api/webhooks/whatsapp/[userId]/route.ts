
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { generateSimpleAIResponse } from '@/ai/simple-ai';
import { getWhatsAppCredentials, downloadMediaAsDataUri, sendWhatsAppMessage } from '@/lib/whatsapp';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This function is triggered to process messages in the background
async function processMessageAsync(userId: string, message: any, contact: any) {
    const from = message.from;
    const profileName = contact?.profile?.name;
    
    console.log(`\n🔥 [WEBHOOK DEBUG] Starting message processing`);
    console.log(`🔥 [WEBHOOK DEBUG] UserId: ${userId}`);
    console.log(`🔥 [WEBHOOK DEBUG] From: ${from}`);
    console.log(`🔥 [WEBHOOK DEBUG] Message type: ${message.type}`);
    console.log(`🔥 [WEBHOOK DEBUG] Full message object:`, JSON.stringify(message, null, 2));
    console.log(`🔥 [WEBHOOK DEBUG] Contact info:`, JSON.stringify(contact, null, 2));
    
    try {
        console.log(`\n🔥 [1/8] Storing initial message for ${from}...`);
        const { messageId, contentForAi } = await storeInitialMessage(userId, from, message, profileName);
        console.log(`🔥 [2/8] ✅ Message ${messageId} stored. Content for AI: "${contentForAi}"`);

        console.log(`\n🔥 [3/8] Fetching user settings for ${userId}...`);
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            console.log(`🔥 [Abort] 🚫 User settings not found for ${userId}.`);
            return;
        }
        const settings = userSettingsDoc.data() || {};
        console.log(`🔥 [4/8] ✅ User settings found:`);
        console.log(`🔥 [4/8] - AI settings:`, JSON.stringify(settings.ai || {}, null, 2));
        console.log(`🔥 [4/8] - Training data:`, JSON.stringify(settings.trainingData || {}, null, 2));

        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        console.log(`\n🔥 [5/8] ℹ️ Global AI status analysis:`);
        console.log(`🔥 [5/8] - AI object exists: ${!!settings.ai}`);
        console.log(`🔥 [5/8] - AI status: "${settings.ai?.status}"`);
        console.log(`🔥 [5/8] - Is "verified": ${settings.ai?.status === 'verified'}`);
        console.log(`🔥 [5/8] - Final isGlobalAiEnabled: ${isGlobalAiEnabled}`);

        console.log(`\n🔥 [6/8] Fetching conversation settings for ${from}...`);
        const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(from).get();
        const conversationData = conversationDoc.exists ? conversationDoc.data() : null;
        const isChatAiEnabled = !conversationDoc.exists || conversationDoc.data()?.isAiEnabled !== false;
        console.log(`🔥 [7/8] ℹ️ Chat AI status analysis:`);
        console.log(`🔥 [7/8] - Conversation doc exists: ${conversationDoc.exists}`);
        console.log(`🔥 [7/8] - Conversation data:`, JSON.stringify(conversationData, null, 2));
        console.log(`🔥 [7/8] - isAiEnabled field: ${conversationData?.isAiEnabled}`);
        console.log(`🔥 [7/8] - Final isChatAiEnabled: ${isChatAiEnabled}`);

        console.log(`\n🔥 [8/8] Final AI decision:`);
        console.log(`🔥 [8/8] - isGlobalAiEnabled: ${isGlobalAiEnabled}`);
        console.log(`🔥 [8/8] - isChatAiEnabled: ${isChatAiEnabled}`);
        console.log(`🔥 [8/8] - Both enabled: ${isGlobalAiEnabled && isChatAiEnabled}`);
        
        if (isGlobalAiEnabled && isChatAiEnabled) {
            console.log('\n🔥 [AI-START] 🤖 AI is enabled. Proceeding to generate response...');
            
            const apiKey = settings.ai?.apiKey || 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA';
            const modelName = settings.ai?.model || 'gemini-2.0-flash';
            
            console.log(`🔥 [AI-CONFIG] API Key analysis:`);
            console.log(`🔥 [AI-CONFIG] - Has custom API key: ${!!settings.ai?.apiKey}`);
            console.log(`🔥 [AI-CONFIG] - Using API key: ${apiKey.substring(0, 10)}... (${apiKey.length} chars)`);
            console.log(`🔥 [AI-CONFIG] - Model: ${modelName}`);

            if (!apiKey) {
                console.error("🔥 [Abort] 🔴 AI API key is missing. Cannot generate response.");
                return;
            }

            // Small delay to ensure Firestore write consistency
            console.log('\n🔥 [AI-HISTORY] ⏳ Waiting 500ms for Firestore consistency...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fetch conversation history (excluding current message)
            console.log('🔥 [AI-HISTORY] 📜 Fetching conversation history...');
            const pastHistory = await getConversationHistory(userId, from);
            
            // Add current message to history for complete context
            const currentMessageLine = `Customer: ${contentForAi}`;
            const conversationHistory = pastHistory === "No previous conversation history." 
                ? currentMessageLine
                : `${pastHistory}\n${currentMessageLine}`;
                
            console.log(`🔥 [AI-HISTORY] Past history (${pastHistory.length} chars): ${pastHistory}`);
            console.log(`🔥 [AI-HISTORY] Current message: ${currentMessageLine}`);
            console.log(`🔥 [AI-HISTORY] Complete history (${conversationHistory.length} chars): ${conversationHistory}`);

            const trainingContext = settings.trainingData || {};
            const fullTrainingData = `
              TRAINING DATA: ${trainingContext.clientData || ""}
              INSTRUCTIONS: ${trainingContext.trainingInstructions || ""}
              CHAT FLOW: ${trainingContext.chatFlow || ""}
            `.trim();
            
            console.log(`\n🔥 [AI-TRAINING] Training data analysis:`);
            console.log(`🔥 [AI-TRAINING] - clientData: "${trainingContext.clientData || 'EMPTY'}"`); 
            console.log(`🔥 [AI-TRAINING] - trainingInstructions: "${trainingContext.trainingInstructions || 'EMPTY'}"`); 
            console.log(`🔥 [AI-TRAINING] - chatFlow: "${trainingContext.chatFlow || 'EMPTY'}"`); 
            console.log(`🔥 [AI-TRAINING] - Full training data (${fullTrainingData.length} chars): ${fullTrainingData}`);

            try {
                console.log(`\n🔥 [AI-CALL] 🚀 Calling generateSimpleAIResponse with:`);
                console.log(`🔥 [AI-CALL] - message: "${contentForAi}"`);
                console.log(`🔥 [AI-CALL] - conversationHistory: "${conversationHistory}"`);
                console.log(`🔥 [AI-CALL] - clientData: "${fullTrainingData}"`);
                console.log(`🔥 [AI-CALL] - userApiKey: ${apiKey.substring(0, 10)}...`);
                console.log(`🔥 [AI-CALL] - userModel: "${modelName}"`);
                
                const aiResult = await generateSimpleAIResponse({
                    message: contentForAi,
                    conversationHistory: conversationHistory,
                    clientData: fullTrainingData,
                    userApiKey: apiKey,
                    userModel: modelName,
                });
                
                console.log(`\n🔥 [AI-RESULT] 🤖 AI Result received:`, JSON.stringify(aiResult, null, 2));

                if (aiResult && aiResult.response && aiResult.response.trim()) {
                    console.log(`\n🔥 [AI-SUCCESS] ✅ AI Response generated successfully:`);
                    console.log(`🔥 [AI-SUCCESS] Response: "${aiResult.response}"`);
                    
                    let sendRes = null;
                    let whatsappMessageId = null;
                    
                    try {
                        console.log('\n🔥 [WHATSAPP-SEND] 📤 Attempting to send WhatsApp message...');
                        console.log(`🔥 [WHATSAPP-SEND] - To: ${from}`);
                        console.log(`🔥 [WHATSAPP-SEND] - Message: "${aiResult.response}"`);
                        
                        // Clean the AI response (remove extra newlines/spaces that might cause API errors)
                        const cleanResponse = aiResult.response.trim().replace(/\n+/g, ' ');
                        console.log(`🔥 [WHATSAPP-SEND] - Cleaned message: "${cleanResponse}"`);
                        
                        // Try sending with proper message structure
                        sendRes = await sendWhatsAppMessage(userId, from, { 
                            type: 'text', 
                            text: { body: cleanResponse } 
                        });
                        
                        whatsappMessageId = sendRes?.messages?.[0]?.id || sendRes?.messages?.[0]?.message_id;
                        
                        console.log(`🔥 [WHATSAPP-SEND] ✅ AI response sent successfully to ${from}`);
                        console.log(`🔥 [WHATSAPP-SEND] WhatsApp message ID: ${whatsappMessageId}`);
                        console.log(`🔥 [WHATSAPP-SEND] Full send response:`, JSON.stringify(sendRes, null, 2));
                        
                    } catch (whatsappError: any) {
                        console.error('\n🔥 [WHATSAPP-ERROR] ⚠️ Failed to send WhatsApp message:');
                        console.error(`🔥 [WHATSAPP-ERROR] Error message: ${whatsappError.message}`);
                        console.error(`🔥 [WHATSAPP-ERROR] Error response status: ${whatsappError.response?.status}`);
                        console.error(`🔥 [WHATSAPP-ERROR] Error response data:`, JSON.stringify(whatsappError.response?.data, null, 2));
                        console.error(`🔥 [WHATSAPP-ERROR] Error stack:`, whatsappError.stack);
                        
                        // Try alternative sending method
                        try {
                            console.log(`🔥 [WHATSAPP-RETRY] Trying alternative send method...`);
                            
                            // Get WhatsApp credentials directly
                            const { phoneNumberId, accessToken } = await getWhatsAppCredentials(userId, ['phoneNumberId', 'accessToken']);
                            
                            // Direct API call with fetch instead of axios
                            const directResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    messaging_product: 'whatsapp',
                                    to: from,
                                    type: 'text',
                                    text: { body: cleanResponse }
                                })
                            });
                            
                            if (directResponse.ok) {
                                const directResult = await directResponse.json();
                                whatsappMessageId = directResult?.messages?.[0]?.id;
                                console.log(`🔥 [WHATSAPP-RETRY] ✅ Alternative method worked! Message ID: ${whatsappMessageId}`);
                            } else {
                                const errorData = await directResponse.text();
                                console.error(`🔥 [WHATSAPP-RETRY] 🔴 Alternative method also failed: ${directResponse.status} ${errorData}`);
                            }
                        } catch (retryError: any) {
                            console.error(`🔥 [WHATSAPP-RETRY] 🔴 Retry failed:`, retryError.message);
                        }
                        
                        // CRITICAL: Even if all WhatsApp sending fails, we continue to save the message
                        console.log(`🔥 [WHATSAPP-ERROR] ⚠️ WhatsApp send failed, but continuing to save AI response to database...`);
                    }

                    try {
                        console.log('\n🔥 [DB-SAVE] 💾 Storing AI response in Firestore...');
                        // Always persist the AI (agent) message to Firestore so it appears in the chat UI
                        await storeAgentMessage(userId, from, {
                            content: aiResult.response,
                            type: 'text',
                            sender: 'agent',
                            whatsappMessageId: whatsappMessageId,
                        });
                        console.log('🔥 [DB-SAVE] ✅ Successfully stored AI response in Firestore conversation messages.');
                    } catch (persistErr: any) {
                        console.error('\n🔥 [DB-ERROR] 🔴 CRITICAL: Failed to store AI response in Firestore:');
                        console.error(`🔥 [DB-ERROR] Error message: ${persistErr.message}`);
                        console.error(`🔥 [DB-ERROR] Error stack:`, persistErr.stack);
                    }
                } else {
                    console.log(`\n🔥 [AI-EMPTY] 🤖 AI generated an empty or invalid response:`);
                    console.log(`🔥 [AI-EMPTY] aiResult object:`, JSON.stringify(aiResult, null, 2));
                    console.log(`🔥 [AI-EMPTY] Response exists: ${!!aiResult?.response}`);
                    console.log(`🔥 [AI-EMPTY] Response trimmed length: ${aiResult?.response?.trim()?.length || 0}`);
                }
            } catch (aiError: any) {
                console.error("\n🔥 [AI-ERROR] 🔴 FAILED TO GENERATE OR SEND AI RESPONSE:");
                console.error(`🔥 [AI-ERROR] Error name: ${aiError.name}`);
                console.error(`🔥 [AI-ERROR] Error message: ${aiError.message}`);
                console.error(`🔥 [AI-ERROR] Error cause: ${aiError.cause}`);
                console.error(`🔥 [AI-ERROR] Full error object:`, aiError);
                console.error(`🔥 [AI-ERROR] Error stack:`, aiError.stack);
            }

        } else {
            console.log('\n🔥 [AI-DISABLED] 🤖 AI is disabled - no response will be sent.');
            console.log(`🔥 [AI-DISABLED] Reason: globalAI=${isGlobalAiEnabled}, chatAI=${isChatAiEnabled}`);
            if (!isGlobalAiEnabled) {
                console.log(`🔥 [AI-DISABLED] Global AI not verified. Status: "${settings.ai?.status}"`);
            }
            if (!isChatAiEnabled) {
                console.log(`🔥 [AI-DISABLED] Chat AI disabled for conversation ${from}`);
            }
        }

        if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.type)) {
            processMediaInBackground(userId, from, message, messageId).catch(err => {
                console.error("🔴 Background media processing failed:", err);
            });
        }

    } catch (error: any) {
        console.error(`\n🔥 [FATAL-ERROR] 🔴 UNEXPECTED ERROR processing message from ${from}:`);
        console.error(`🔥 [FATAL-ERROR] Error name: ${error.name}`);
        console.error(`🔥 [FATAL-ERROR] Error message: ${error.message}`);
        console.error(`🔥 [FATAL-ERROR] Full error object:`, error);
        console.error(`🔥 [FATAL-ERROR] Error stack:`, error.stack);
    }
    
    console.log(`\n🔥 [WEBHOOK-END] ✅ Finished processing message from ${from} for user ${userId}`);
}


/**
 * Handles webhook verification from Meta.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    const timestamp = new Date().toISOString();
    
    console.log(`\n\n🔥 =========================== WEBHOOK RECEIVED ===========================`);
    console.log(`🔥 [WEBHOOK-START] Timestamp: ${timestamp}`);
    console.log(`🔥 [WEBHOOK-START] User ID: ${userId}`);
    
    try {
        const body = await req.json();
        console.log(`🔥 [WEBHOOK-BODY] Full webhook body:`);
        console.log(JSON.stringify(body, null, 2));

        const value = body.entry?.[0]?.changes?.[0]?.value;
        console.log(`🔥 [WEBHOOK-VALUE] Extracted value object:`, JSON.stringify(value, null, 2));

        if (!value || (!value.messages && !value.statuses)) {
             console.log("🔥 [WEBHOOK-SKIP] Discarding: Event is not a message or status update.");
             return NextResponse.json({ status: 'not a message or status update' }, { status: 200 });
        }
        
        if (value.messages) {
            console.log("🔥 [WEBHOOK-MESSAGE] Message received, processing in background...");
            console.log(`🔥 [WEBHOOK-MESSAGE] Message count: ${value.messages.length}`);
            
            try {
                const message = value.messages[0];
                const contact = value.contacts?.[0];
                console.log(`🔥 [WEBHOOK-MESSAGE] Processing message from: ${message.from}`);
                console.log(`🔥 [WEBHOOK-MESSAGE] Message type: ${message.type}`);
                
                // Process in background but don't await (webhook needs to respond quickly)
                processMessageAsync(userId, message, contact).catch(bgError => {
                    console.error(`🔥 [WEBHOOK-BG-ERROR] Background processing failed:`, bgError);
                });
                
            } catch (e) {
                console.error('🔥 [WEBHOOK-CRASH] 🔴 IMMEDIATE CRASH in processMessageAsync:', e);
            }
        }

        if (value.statuses) {
            console.log(`🔥 [WEBHOOK-STATUS] Received status update:`, JSON.stringify(value.statuses[0], null, 2));
        }

        console.log(`🔥 [WEBHOOK-RESPONSE] Sending OK response to Meta`);
        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error: any) {
        console.error('🔥 [WEBHOOK-PARSE-ERROR] 🔴 FAILED TO PARSE WEBHOOK BODY:');
        console.error(`🔥 [WEBHOOK-PARSE-ERROR] Error message: ${error.message}`);
        console.error(`🔥 [WEBHOOK-PARSE-ERROR] Error stack:`, error.stack);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}


/**
 * Stores an agent (AI) message in Firestore and updates the conversation meta.
 */
async function storeAgentMessage(
  userId: string,
  conversationId: string,
  messageData: { content: string; type: string; sender: 'agent'; whatsappMessageId?: string }
) {
  const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
  const messagesCol = conversationRef.collection('messages');
  const messageRef = messagesCol.doc();

  const batch = db.batch();
  batch.set(messageRef, {
    ...messageData,
    timestamp: FieldValue.serverTimestamp(),
    status: 'sent',
  });
  // Update conversation but do NOT increment unreadCount for outgoing messages
  batch.set(
    conversationRef,
    {
      lastUpdated: FieldValue.serverTimestamp(),
      lastMessage: messageData.content || `[${messageData.type}]`,
    },
    { merge: true }
  );

  await batch.commit();
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
 * Retrieves the last 15 messages from a conversation for AI context (excluding very recent ones to avoid race conditions)
 */
async function getConversationHistory(userId: string, conversationId: string): Promise<string> {
    try {
        const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
        
        // Get messages older than 1 second ago to avoid race conditions with current message storage
        const oneSecondAgo = new Date(Date.now() - 1000);
        const messagesSnapshot = await messagesRef
            .where('timestamp', '<', oneSecondAgo)
            .orderBy('timestamp', 'desc')
            .limit(15)
            .get();
        
        console.log(`🔥 [HISTORY-DEBUG] Found ${messagesSnapshot.docs.length} historical messages`);
        
        if (messagesSnapshot.empty) {
            console.log(`🔥 [HISTORY-DEBUG] No historical messages found`);
            return "No previous conversation history.";
        }
        
        const messages = messagesSnapshot.docs.reverse().map((doc, index) => {
            const data = doc.data();
            const sender = data.sender === 'customer' ? 'Customer' : 'Agent';
            const content = data.content || `[${data.type} message]`;
            const timestamp = data.timestamp?.toDate?.() || 'unknown time';
            console.log(`🔥 [HISTORY-DEBUG] Message ${index + 1}: ${sender} at ${timestamp} - "${content}"`);
            return `${sender}: ${content}`;
        });
        
        const historyText = messages.join('\n');
        console.log(`🔥 [HISTORY-DEBUG] Final history text: "${historyText}"`);
        return historyText;
    } catch (error) {
        console.error('🔥 [HISTORY-ERROR] Error fetching conversation history:', error);
        return "Error retrieving conversation history.";
    }
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
