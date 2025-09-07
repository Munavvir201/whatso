import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        console.log('🔍 SIMULATING REAL WHATSAPP WEBHOOK...');
        
        // Get your actual user ID
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02"; // Your user ID from earlier test
        const phoneNumber = "+1234567890"; // Test phone number
        
        // Create a realistic WhatsApp webhook payload
        const webhookPayload = {
            entry: [{
                changes: [{
                    value: {
                        messages: [{
                            from: phoneNumber,
                            type: "text",
                            id: "test_msg_" + Date.now(),
                            text: {
                                body: "Hello, I'm interested in your services"
                            }
                        }],
                        contacts: [{
                            profile: {
                                name: "Test Customer"
                            }
                        }]
                    }
                }]
            }]
        };
        
        console.log('📋 Webhook payload created:', JSON.stringify(webhookPayload, null, 2));
        
        // Call the actual webhook endpoint
        const webhookUrl = `http://localhost:3000/api/webhooks/whatsapp/${userId}`;
        console.log('🚀 Calling webhook:', webhookUrl);
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
        });
        
        const result = await response.text();
        
        console.log('📬 Webhook response status:', response.status);
        console.log('📬 Webhook response:', result);
        
        return NextResponse.json({
            success: true,
            webhookStatus: response.status,
            webhookResponse: result,
            message: "Real webhook simulation completed"
        });
        
    } catch (error: any) {
        console.error('❌ Webhook simulation failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            }
        }, { status: 500 });
    }
}
