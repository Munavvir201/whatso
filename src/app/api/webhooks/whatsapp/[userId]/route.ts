
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

/**
 * Handles webhook verification from Meta.
 * This simplified function checks if the incoming 'hub.verify_token' matches
 * the one stored in the database. If it matches, it responds with the
 * 'hub.challenge' value to verify the webhook.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const { searchParams } = new URL(req.url);

  const incomingToken = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log(`--- Simplified Webhook Verification for User: ${userId} ---`);
  console.log(`  - Incoming Token: ${incomingToken}`);

  // The token and challenge are required for verification.
  if (!incomingToken || !challenge) {
    console.error('🔴 Verification FAILED: Missing hub.verify_token or hub.challenge.');
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // Retrieve the stored webhook secret from Firestore.
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();
    const storedToken = docSnap.data()?.whatsapp?.webhookSecret;

    if (!storedToken) {
      console.error(`🔴 Verification FAILED: No webhook secret found in DB for user ${userId}.`);
      return NextResponse.json({ error: 'Token not configured' }, { status: 404 });
    }

    console.log(`  - Comparing with stored token.`);

    // --- Main Verification Logic ---
    if (incomingToken === storedToken) {
      // Tokens match. Respond with the challenge to verify the webhook.
      console.log(`✅ Verification SUCCESS: Tokens match. Responding with challenge.`);
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      // Tokens do not match.
      console.error(`🔴 Verification FAILED: Token mismatch.`);
      return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
    }
  } catch (error) {
    // This will catch any errors during database access, including Firebase init issues.
    console.error('🔴 UNEXPECTED ERROR during verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handles incoming messages from WhatsApp.
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;
    const body = await req.json();

    console.log('--- New WhatsApp Message Received ---', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
        console.log('Discarding: Not a WhatsApp business account message.');
        return NextResponse.json({ status: 'not a whatsapp message' }, { status: 200 });
    }
    
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
        console.log('Discarding: No message found in payload.');
        return NextResponse.json({ status: 'no message found' }, { status: 200 });
    }

    // Respond to Meta immediately as required
    const response = NextResponse.json({ status: 'ok' }, { status: 200 });

    // Process the message in the background
    processMessageAsync(userId, message);

    return response;
}

/**
 * Processes a WhatsApp message asynchronously.
 */
async function processMessageAsync(userId: string, message: any) {
    try {
        const userSettingsRef = db.collection('userSettings').doc(userId);
        const docSnap = await userSettingsRef.get();

        if (!docSnap.exists) {
            console.error(`🔴 Message Processing FAILED: Settings not found for user ${userId}.`);
            return;
        }
        const whatsappSettings = docSnap.data()?.whatsapp;

        if (!whatsappSettings?.phoneNumberId || !whatsappSettings?.accessToken) {
            console.error(`🔴 Message Processing FAILED: Missing WhatsApp credentials for user ${userId}.`);
            return;
        }

        if (!message.text?.body) {
            console.log('Skipping AI processing: Message is not a text message.');
            return;
        }

        // TODO: In a real app, you would store and retrieve conversation history
        const conversationHistory = "User: " + message.text.body;

        const aiResponse = await automateWhatsAppChat({
            message: message.text.body,
            conversationHistory: conversationHistory,
        });

        await fetch(`https://graph.facebook.com/v20.0/${whatsappSettings.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappSettings.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: message.from,
                text: { body: aiResponse.response },
            }),
        });

        console.log('✅ Successfully sent AI response to WhatsApp user.');

    } catch (error) {
        console.error("🔴 UNEXPECTED ERROR processing message and sending reply:", error);
    }
}
