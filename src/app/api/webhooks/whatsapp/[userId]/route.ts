
import { NextRequest, NextResponse } from 'next/server';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';
import { db } from '@/lib/firebase-admin';

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

  console.log('Meta webhook verification request received for userId:', userId);

  if (!mode || !challenge || !token) {
    console.error('Missing required query parameters for webhook verification');
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }
  
  try {
    const userSettingsRef = db.collection('userSettings').doc(userId);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists) {
        console.error(`Settings not found for user ${userId}. Cannot verify webhook.`);
        return NextResponse.json({ error: 'User settings not found' }, { status: 404 });
    }
    const whatsappSettings = docSnap.data()?.whatsapp;

    if (!whatsappSettings?.webhookSecret) {
        console.error(`Webhook secret not found for user ${userId}.`);
         return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 });
    }

    if (mode === 'subscribe' && token === whatsappSettings.webhookSecret) {
      await userSettingsRef.update({
          'whatsapp.status': 'connected'
      });
      
      console.log(`✅ Webhook verified successfully for userId: ${userId}`);
      return new NextResponse(challenge, { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' } 
      });
    } else {
      console.error(`Webhook verification failed for user ${userId}. Token mismatch.`);
      return NextResponse.json({ error: 'Verification failed - token mismatch' }, { status: 403 });
    }
  } catch (error) {
    console.error(`Error during webhook verification for user ${userId}:`, error);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
  }
}


/**
 * Handles incoming messages from WhatsApp.
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
    const { userId } = params;
    const body = await req.json();

    // Log the incoming webhook body for debugging
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Basic validation of the incoming payload
    if (body.object !== 'whatsapp_business_account') {
        console.log('Not a WhatsApp business account message');
        return NextResponse.json({ status: 'not a whatsapp message' }, { status: 200 });
    }
    
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
        console.log('No message found in webhook payload');
        return NextResponse.json({ status: 'no message found' }, { status: 200 });
    }

    // Return 200 quickly as requested, then process asynchronously
    const response = NextResponse.json({ status: 'ok' }, { status: 200 });

    // Process the message asynchronously (don't await)
    processMessageAsync(userId, message, body);

    return response;
}

/**
 * Process WhatsApp message asynchronously
 */
async function processMessageAsync(userId: string, message: any, body: any) {
    try {
        // Fetch user credentials
        const userSettingsRef = db.collection('userSettings').doc(userId);
        const docSnap = await userSettingsRef.get();

        if (!docSnap.exists) {
            console.error(`Settings not found for user ${userId}. Cannot process message.`);
            return;
        }
        const whatsappSettings = docSnap.data()?.whatsapp;

        if (!whatsappSettings?.phoneNumberId || !whatsappSettings?.accessToken) {
            console.error(`Missing WhatsApp credentials for user ${userId}.`);
            return;
        }

        // Only process text messages for now
        if (!message.text?.body) {
            console.log('Message is not a text message, skipping AI processing');
            return;
        }

        // TODO: In a real app, you would store and retrieve conversation history
        const conversationHistory = "User: " + message.text.body;

        // Get AI response
        const aiResponse = await automateWhatsAppChat({
            message: message.text.body,
            conversationHistory: conversationHistory,
        });

        // Send the AI response back to the user via WhatsApp API
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

        console.log('Successfully sent AI response to WhatsApp user');

    } catch (error) {
        console.error("Error processing message and sending reply:", error);
    }
}
