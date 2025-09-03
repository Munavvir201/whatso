
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin'; // Using admin SDK for backend operations
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

// NOTE: You must configure the Firebase Admin SDK for this to work.
// This involves setting up service account credentials in your deployment environment.

/**
 * Handles webhook verification from Meta.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const token = searchParams.get('hub.verify_token');

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });
  }

  try {
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists) {
      console.error(`No settings found for userId: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const settings = docSnap.data();
    if (settings?.whatsapp?.webhookSecret === token) {
      console.log(`Verified webhook for userId: ${userId}`);
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
      console.error(`Webhook verification failed for userId: ${userId}. Tokens do not match.`);
      return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error during webhook verification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


/**
 * Handles incoming messages from WhatsApp.
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;
    const body = await req.json();

    // Basic validation of the incoming payload
    if (body.object !== 'whatsapp_business_account') {
        return NextResponse.json({ status: 'not a whatsapp message' });
    }
    
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ status: 'no message found' });
    }

    // Fetch user credentials
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists) {
        console.error(`Settings not found for user ${userId}. Cannot process message.`);
        return NextResponse.json({ error: 'Configuration not found' }, { status: 500 });
    }
    const { phoneNumberId, accessToken } = docSnap.data()?.whatsapp;

    if (!phoneNumberId || !accessToken) {
        console.error(`Missing WhatsApp credentials for user ${userId}.`);
        return NextResponse.json({ error: 'Credentials not configured' }, { status: 500 });
    }

    // TODO: In a real app, you would store and retrieve conversation history
    const conversationHistory = "User: " + message.text.body;

    try {
        // Get AI response
        const aiResponse = await automateWhatsAppChat({
            message: message.text.body,
            conversationHistory: conversationHistory,
        });

        // Send the AI response back to the user via WhatsApp API
        await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: message.from,
                text: { body: aiResponse.response },
            }),
        });

        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error("Error processing message and sending reply:", error);
        return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
    }
}
