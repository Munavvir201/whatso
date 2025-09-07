import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
    const phoneNumber = "+1234567890";
    
    const testMessages = [
        "Hello, I'm interested in your products",
        "Can you tell me more about pricing?",
        "What are your operating hours?"
    ];
    
    const results: any[] = [];
    
    try {
        console.log('🧪 Testing multiple messages to check AI continuity...');
        
        for (let i = 0; i < testMessages.length; i++) {
            const messageText = testMessages[i];
            console.log(`\n📋 [Message ${i + 1}/${testMessages.length}] Testing: "${messageText}"`);
            
            // Create webhook payload
            const webhookPayload = {
                entry: [{
                    changes: [{
                        value: {
                            messages: [{
                                from: phoneNumber,
                                type: "text",
                                id: `wamid.test_${Date.now()}_${i}`,
                                text: {
                                    body: messageText
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
            
            // Call webhook
            const response = await fetch(`http://localhost:3000/api/webhooks/whatsapp/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
            });
            
            const responseText = await response.text();
            
            results.push({
                messageNumber: i + 1,
                message: messageText,
                webhookStatus: response.status,
                webhookResponse: responseText,
                success: response.status === 200
            });
            
            console.log(`📬 [Message ${i + 1}] Webhook response: ${response.status}`);
            
            // Wait a bit between messages for processing
            if (i < testMessages.length - 1) {
                console.log('⏳ Waiting 2 seconds before next message...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('✅ Multi-message test completed');
        console.log('📋 Check your server logs for detailed AI processing information');
        console.log('📋 Check Dashboard → Chat to see if AI responses appear');
        
        return NextResponse.json({
            success: true,
            message: "Multi-message test completed",
            results: results,
            instructions: [
                "Check your server console for detailed AI processing logs",
                "Go to Dashboard → Chat to see if AI responses appear",
                "Verify that AI continues responding after each message"
            ]
        });
        
    } catch (error: any) {
        console.error('❌ Multi-message test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                stack: error.stack
            },
            results: results
        }, { status: 500 });
    }
}
