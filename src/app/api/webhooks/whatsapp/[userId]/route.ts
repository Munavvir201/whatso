
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

/**
 * Handles webhook verification from Meta (Facebook).
 * To verify the webhook, Meta sends a GET request to this endpoint.
 * The request includes a 'hub.verify_token' and a 'hub.challenge'.
 * This function checks if the 'hub.verify_token' matches the one stored
 * in the user's settings. If it matches, it responds with the 'hub.challenge'
 * value to complete the verification process.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const { searchParams } = new URL(req.url);

  // Extract parameters from Meta's verification request
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const incomingVerifyToken = searchParams.get('hub.verify_token');

  console.log(`--- WhatsApp Webhook Verification for User: ${userId} ---`);

  // --- 1. Validate Request ---
  // Meta requires 'hub.mode', 'hub.challenge', and 'hub.verify_token'.
  if (!mode || !challenge || !incomingVerifyToken) {
    console.error('🔴 Verification FAILED: Missing required query parameters.');
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }
  
  // The 'hub.mode' must be 'subscribe'.
  if (mode !== 'subscribe') {
    console.error(`🔴 Verification FAILED: hub.mode is not 'subscribe' (was: ${mode}).`);
    return NextResponse.json({ error: `hub.mode must be 'subscribe'` }, { status: 400 });
  }

  console.log(`  - hub.mode: ${mode}`);
  console.log(`  - hub.verify_token: ${incomingVerifyToken}`);
  console.log(`  - hub.challenge: ${challenge}`);

  try {
    // --- 2. Retrieve Stored Verify Token ---
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists) {
        console.error(`🔴 Verification FAILED: No settings found for user ${userId}.`);
        return NextResponse.json({ error: 'User settings not found' }, { status: 404 });
    }

    // The verify token is stored in the 'whatsapp.webhookSecret' field.
    const storedVerifyToken = docSnap.data()?.whatsapp?.webhookSecret;

    if (!storedVerifyToken) {
        console.error(`🔴 Verification FAILED: Verify token (webhookSecret) is not configured in database for user ${userId}.`);
        return NextResponse.json({ error: 'Webhook verify token not configured' }, { status: 400 });
    }
    console.log(`  - Comparing with stored token...`);

    // --- 3. Compare Tokens ---
    if (incomingVerifyToken === storedVerifyToken) {
      // Tokens match. The webhook is legitimate.
      console.log(`✅ Verification SUCCESS: Tokens match for user ${userId}.`);
      
      // --- 4. Update Status & Respond ---
      // Update the user's WhatsApp status to 'verified' in the database.
      await userSettingsRef.update({ 'whatsapp.status': 'verified' });
      console.log(`  - User status updated to 'verified'.`);
      
      // Respond with the challenge code to Meta to complete verification.
      console.log(`  - Responding with challenge to Meta.`);
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      // Tokens do not match.
      console.error(`🔴 Verification FAILED: Token mismatch for user ${userId}.`);
      return NextResponse.json({ error: 'Verification failed - token mismatch' }, { status: 403 });
    }
  } catch (error) {
    console.error(`🔴 UNEXPECTED ERROR during verification for user ${userId}:`, error);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
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
