
import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';

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
 * This function only stores the message in Firestore.
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
        storeMessageAsync(userId, message).catch(err => {
            console.error("Error in async message processing:", err);
        });

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error) {
        console.error('🔴 FAILED TO PARSE WEBHOOK BODY:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

/**
 * Stores an incoming WhatsApp message in Firestore.
 */
async function storeMessageAsync(userId: string, message: any) {
    if (message.type !== 'text' || !message.text?.body) {
        console.log('Skipping storage: Message is not a text message.');
        return;
    }

    const from = message.from; // Customer's phone number
    const messageBody = message.text.body;

    try {
        // The conversation ID is the customer's phone number
        const conversationId = from;
        const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
        
        // Ensure conversation document exists
        await conversationRef.set({
            lastUpdated: FieldValue.serverTimestamp(),
            customerName: 'Customer ' + from.slice(-4), // Placeholder name
            customerNumber: from,
        }, { merge: true });

        // Add the new message to the 'messages' subcollection
        const messagesRef = conversationRef.collection('messages');
        await messagesRef.add({
            sender: 'customer',
            content: messageBody,
            timestamp: FieldValue.serverTimestamp(),
            whatsappMessageId: message.id,
        });

        console.log(`✅ Successfully stored message from ${from} for user ${userId}.`);

    } catch (error) {
        console.error(`🔴 UNEXPECTED ERROR storing message from ${from}:`, error);
    }
}
