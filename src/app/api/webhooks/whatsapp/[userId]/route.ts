

import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

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
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists || !docSnap.data()?.whatsapp?.webhookSecret) {
      console.error(`🔴 Verification FAILED: No webhook secret found for user ${userId}.`);
      return NextResponse.json({ error: 'User settings or webhook secret not found' }, { status: 404 });
    }

    const storedToken = docSnap.data()?.whatsapp.webhookSecret;
    
    console.log(`Received Token from Meta: "${token}"`);
    console.log(`Stored Token in DB:     "${storedToken}"`);


    if (token === storedToken) {
      console.log(`✅ Verification SUCCESS: Tokens match.`);
      // Update status to 'verified' upon successful verification
      await userSettingsRef.set({ whatsapp: { status: 'verified' } }, { merge: true });
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      console.error(`🔴 Verification FAILED: Token mismatch.`);
      return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
    }
  } catch (error) {
    console.error('🔴 UNEXPECTED ERROR during verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handles incoming messages from WhatsApp.
 */
export async function POST(req: NextRequest, { params }: { params: { userId:string } }) {
    const { userId } = params;
    
    try {
        const body = await req.json();
        console.log('--- New WhatsApp Message Received ---', JSON.stringify(body, null, 2));

        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (body.object !== 'whatsapp_business_account' || !message) {
            console.log('Discarding: Not a valid WhatsApp message payload.');
            return NextResponse.json({ status: 'not a valid whatsapp message' }, { status: 200 });
        }

        // Respond to Meta immediately as required
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
 * Processes a WhatsApp message asynchronously, including conversation history.
 */
async function processMessageAsync(userId: string, message: any) {
    if (message.type !== 'text' || !message.text?.body) {
        console.log('Skipping processing: Message is not a text message.');
        return;
    }

    const from = message.from; // Customer's phone number
    const messageBody = message.text.body;

    try {
        const userSettingsRef = db.collection('userSettings').doc(userId);
        const docSnap = await userSettingsRef.get();
        const whatsappSettings = docSnap.data()?.whatsapp;

        if (!whatsappSettings?.phoneNumberId || !whatsappSettings?.accessToken) {
            console.error(`🔴 AI Processing FAILED: Missing WhatsApp credentials for user ${userId}.`);
            return;
        }

        // --- Conversation History Management ---
        const conversationRef = db.collection('users').doc(userId).collection('conversations').doc(from);
        const conversationSnap = await conversationRef.get();
        let history = conversationSnap.exists ? conversationSnap.data()?.history || [] : [];
        
        // Add new user message to history
        const userMessageEntry = { role: 'user', content: messageBody };
        history.push(userMessageEntry);

        // Call AI with current message and history
        const aiResponse = await automateWhatsAppChat({
            message: messageBody,
            conversationHistory: history.map((h: any) => `${h.role}: ${h.content}`).join('\n'),
        });
        
        const aiMessageEntry = { role: 'ai', content: aiResponse.response };
        history.push(aiMessageEntry);

        // --- Persist Conversation ---
        await conversationRef.set({
            history: history,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });

        // --- Send Response via WhatsApp API ---
        await fetch(`https://graph.facebook.com/v20.0/${whatsappSettings.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappSettings.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: from,
                text: { body: aiResponse.response },
            }),
        });

        console.log(`✅ Successfully sent AI response to ${from}.`);

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR processing message for ${from}:`, error);
    }
}
