import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
    
    try {
        console.log('🚀 TESTING WEBHOOK PROCESSING...');
        
        // Simulate a WhatsApp webhook payload
        const webhookPayload = {
            entry: [{
                changes: [{
                    value: {
                        messages: [{
                            from: "+1234567890",
                            type: "text",
                            id: `wamid.test_${Date.now()}`,
                            text: {
                                body: "Hello, I'm testing the AI agent!"
                            }
                        }],
                        contacts: [{
                            profile: {
                                name: "Test User"
                            }
                        }]
                    }
                }]
            }]
        };
        
        console.log('📋 Simulating webhook call with payload:', JSON.stringify(webhookPayload, null, 2));
        
        // Call the webhook
        const response = await fetch(`http://localhost:3000/api/webhooks/whatsapp/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
        });
        
        const responseText = await response.text();
        
        console.log('📬 Webhook response status:', response.status);
        console.log('📬 Webhook response body:', responseText);
        
        // Wait a moment for background processing
        console.log('⏳ Waiting 3 seconds for background processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return NextResponse.json({
            success: true,
            webhookStatus: response.status,
            webhookResponse: responseText,
            message: "Webhook test completed - check your server console for detailed logs"
        });
        
    } catch (error: any) {
        console.error('❌ Webhook test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            }
        }, { status: 500 });
    }
}
