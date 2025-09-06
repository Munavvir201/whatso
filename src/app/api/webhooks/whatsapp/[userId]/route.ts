
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

async function getWhatsAppCredentials(userId: string) {
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists || !docSnap.data()?.whatsapp) {
        throw new Error("WhatsApp credentials not configured for this user.");
    }
    const { phoneNumberId, accessToken, webhookSecret } = docSnap.data()?.whatsapp;
    if (!phoneNumberId || !accessToken || !webhookSecret) {
        throw new Error("Missing Phone Number ID, Access Token, or Webhook Secret.");
    }
    return { phoneNumberId, accessToken, webhookSecret };
}


/**
 * Handles webhook verification from Meta.
 * This function validates the incoming 'hub.verify_token' against the one
 * stored in Firestore and updates the user's status to 'verified'.
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
      // Update status to 'verified' upon successful verification
      const userSettingsRef = db.collection('userSettings').doc(userId);
      await userSettingsRef.set({ whatsapp: { status: 'verified' } }, { merge: true });
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      console.error(`🔴 Verification FAILED: Token mismatch.`);
      return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
    }
  } catch (error: any) {
    console.error('🔴 UNEXPECTED ERROR during verification:', error);
    if (error.message.includes("not configured")) {
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

        // Respond to Meta immediately as required, and process the message in the background.
        processMessageAsync(userId, message).catch(err => {
            console.error("Error in async message processing:", err);
        });

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

async function sendWhatsAppMessage(userId: string, to: string, message: string) {
    const { phoneNumberId, accessToken } = await getWhatsAppCredentials(userId);
    
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            text: { body: message },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send WhatsApp message via API:", errorData);
        throw new Error(errorData.error?.message || "Failed to send message via WhatsApp API.");
    }

    const responseData = await response.json();
    console.log("Successfully sent message via API:", responseData);
    return responseData;
}


/**
 * Processes an incoming WhatsApp message: stores it, generates an AI response,
 * sends the response, and stores the response.
 */
async function processMessageAsync(userId: string, message: any) {
    if (message.type !== 'text' || !message.text?.body) {
        console.log('Skipping processing: Message is not a text message.');
        return;
    }

    const from = message.from; // Customer's phone number
    const messageBody = message.text.body;
    const conversationId = from;
    
    try {
        // 1. Store the incoming customer message
        await storeMessage(userId, conversationId, {
            sender: 'customer',
            content: messageBody,
            timestamp: FieldValue.serverTimestamp(),
            whatsappMessageId: message.id,
        });

        // 2. Get conversation history
        const history = await getConversationHistory(userId, conversationId);

        // 3. Get AI response
        const aiResult = await automateWhatsAppChat({
            message: messageBody,
            conversationHistory: history,
        });
        const aiResponse = aiResult.response;

        // 4. Send AI response via WhatsApp
        await sendWhatsAppMessage(userId, from, aiResponse);

        // 5. Store the outgoing AI message
        await storeMessage(userId, conversationId, {
            sender: 'agent',
            content: aiResponse,
            timestamp: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Successfully processed and responded to message from ${from}`);

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message from ${from}:`, error);
    }
}

/**
 * Stores a single message in a conversation and updates conversation metadata.
 */
async function storeMessage(userId: string, conversationId: string, messageData: any) {
    const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
    
    // Use a batch to ensure atomic write
    const batch = db.batch();

    // Set/update conversation metadata
    batch.set(conversationRef, {
        lastUpdated: FieldValue.serverTimestamp(),
        lastMessage: messageData.content,
        customerName: 'Customer ' + conversationId.slice(-4), // Placeholder name
        customerNumber: conversationId,
    }, { merge: true });

    // Add the new message to the 'messages' subcollection
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
        return `${sender}: ${data.content}`;
    }).join('\n');
}
