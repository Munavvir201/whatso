import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
        
        // Simulate a WhatsApp message webhook payload
        const testWebhookPayload = {
            object: "whatsapp_business_account",
            entry: [{
                id: "123456789",
                changes: [{
                    value: {
                        messaging_product: "whatsapp",
                        metadata: {
                            display_phone_number: "1234567890",
                            phone_number_id: "987654321"
                        },
                        messages: [{
                            from: "1234567890",
                            id: "wamid.test123",
                            timestamp: "1234567890",
                            text: {
                                body: "Hello, this is a test message to check AI automation!"
                            },
                            type: "text"
                        }],
                        contacts: [{
                            profile: {
                                name: "Test User"
                            },
                            wa_id: "1234567890"
                        }]
                    },
                    field: "messages"
                }]
            }]
        };
        
        console.log(`🔥 [TEST-WEBHOOK] Calling webhook with test payload...`);
        
        // Call your webhook endpoint
        const webhookResponse = await fetch(`http://localhost:3000/api/webhooks/whatsapp/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testWebhookPayload)
        });
        
        const webhookResult = await webhookResponse.json();
        
        console.log(`🔥 [TEST-WEBHOOK] Webhook response:`, webhookResult);
        
        return NextResponse.json({
            success: true,
            message: 'Test webhook called successfully',
            webhookStatus: webhookResponse.status,
            webhookResult: webhookResult,
            testPayload: testWebhookPayload
        });
        
    } catch (error: any) {
        console.error(`🔥 [TEST-WEBHOOK] Error:`, error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
