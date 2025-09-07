import { NextRequest, NextResponse } from 'next/server';
import { generateSimpleAIResponse } from '@/ai/simple-ai';
import { getWhatsAppCredentials } from '@/lib/whatsapp';

/**
 * SIMPLIFIED webhook - bypasses complex database operations to avoid timeouts
 */

// Handles webhook verification from Meta.
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log(`📞 [WEBHOOK-VERIFY] User: ${userId}, Mode: ${mode}, Token: ${token?.substring(0, 10)}...`);

  if (mode === 'subscribe' && token === 'your_verify_token' && challenge) {
    console.log('✅ [WEBHOOK-VERIFY] Verification successful');
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } else {
    console.error('❌ [WEBHOOK-VERIFY] Verification failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }
}

// Handles incoming messages from WhatsApp.
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    const timestamp = new Date().toISOString();
    
    console.log(`\n🔥 [SIMPLE-WEBHOOK] ${timestamp} - Processing for user: ${userId}`);
    
    try {
        const body = await req.json();
        console.log(`🔥 [SIMPLE-WEBHOOK] Received webhook:`, JSON.stringify(body, null, 2));

        const value = body.entry?.[0]?.changes?.[0]?.value;
        if (!value?.messages) {
            console.log("🔥 [SIMPLE-WEBHOOK] No messages found, returning OK");
            return NextResponse.json({ status: 'no_messages' }, { status: 200 });
        }

        const message = value.messages[0];
        const contact = value.contacts?.[0];
        const from = message.from;
        const messageText = message.text?.body || '[Non-text message]';
        
        console.log(`🔥 [SIMPLE-WEBHOOK] Message from ${from}: "${messageText}"`);

        // Quick response to Meta (don't make them wait)
        setTimeout(async () => {
            await processMessageQuick(userId, from, messageText, contact);
        }, 0);

        console.log(`🔥 [SIMPLE-WEBHOOK] Returning OK to Meta immediately`);
        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error: any) {
        console.error('🔥 [SIMPLE-WEBHOOK] ❌ Error:', error.message);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

async function processMessageQuick(userId: string, from: string, messageText: string, contact: any) {
    try {
        console.log(`\n⚡ [QUICK-AI] Starting quick AI processing...`);
        
        // Generate AI response with minimal context (no database delays)
        const aiResult = await generateSimpleAIResponse({
            message: messageText,
            conversationHistory: 'Previous conversation context', // Simplified
            clientData: 'WhatsO - AI-powered WhatsApp automation service', // Hardcoded business context
            userApiKey: 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA',
            userModel: 'gemini-2.0-flash',
        });
        
        console.log(`⚡ [QUICK-AI] AI Response: "${aiResult.response}"`);
        
        if (aiResult?.response) {
            // Try to send WhatsApp message
            try {
                console.log(`⚡ [QUICK-AI] Attempting to send WhatsApp message...`);
                
                // Get WhatsApp credentials (if this times out, we'll catch it)
                const credentials = await Promise.race([
                    getWhatsAppCredentials(userId, ['phoneNumberId', 'accessToken']),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Credentials timeout')), 5000))
                ]);
                
                const { phoneNumberId, accessToken } = credentials as any;
                
                // Send message to WhatsApp
                const whatsappResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: from,
                        type: 'text',
                        text: { body: aiResult.response.trim() }
                    })
                });
                
                if (whatsappResponse.ok) {
                    console.log(`⚡ [QUICK-AI] ✅ WhatsApp message sent successfully!`);
                } else {
                    const errorText = await whatsappResponse.text();
                    console.error(`⚡ [QUICK-AI] ❌ WhatsApp send failed: ${whatsappResponse.status} ${errorText}`);
                }
                
            } catch (whatsappError: any) {
                console.error(`⚡ [QUICK-AI] ❌ WhatsApp error: ${whatsappError.message}`);
            }
        }
        
        console.log(`⚡ [QUICK-AI] ✅ Quick processing completed`);
        
    } catch (error: any) {
        console.error(`⚡ [QUICK-AI] ❌ Processing failed: ${error.message}`);
    }
}
