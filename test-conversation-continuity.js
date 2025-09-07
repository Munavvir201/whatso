const https = require('https');

const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
const phoneNumber = "919876543210";
const webhookUrl = `https://whatso.vercel.app/api/webhooks/whatsapp/${userId}`;

const testMessages = [
    "Hello, I'm interested in your services",
    "Can you tell me more about pricing?",
    "What are your operating hours?",
    "Do you offer custom solutions?"
];

function sendMessage(message, messageNumber) {
    return new Promise((resolve, reject) => {
        const webhookPayload = {
            object: "whatsapp_business_account",
            entry: [{
                id: "123456789",
                changes: [{
                    value: {
                        messaging_product: "whatsapp",
                        metadata: {
                            display_phone_number: phoneNumber,
                            phone_number_id: "123456789"
                        },
                        messages: [{
                            from: phoneNumber,
                            id: `wamid.test_${Date.now()}_${messageNumber}`,
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            text: {
                                body: message
                            },
                            type: "text"
                        }],
                        contacts: [{
                            profile: {
                                name: "Test Customer"
                            },
                            wa_id: phoneNumber
                        }]
                    },
                    field: "messages"
                }]
            }]
        };

        const data = JSON.stringify(webhookPayload);
        
        const options = {
            hostname: 'whatso.vercel.app',
            port: 443,
            path: `/api/webhooks/whatsapp/${userId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        console.log(`\n📨 [Message ${messageNumber}] Sending: "${message}"`);
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log(`📬 [Message ${messageNumber}] Response Status: ${res.statusCode}`);
                console.log(`📬 [Message ${messageNumber}] Response Body: ${responseData}`);
                resolve({
                    messageNumber,
                    message,
                    status: res.statusCode,
                    response: responseData
                });
            });
        });

        req.on('error', (error) => {
            console.error(`❌ [Message ${messageNumber}] Error:`, error.message);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function testConversationContinuity() {
    console.log('🧪 Testing AI conversation continuity...');
    console.log(`👤 Using phone number: ${phoneNumber}`);
    console.log(`🔗 Webhook URL: ${webhookUrl}\n`);

    const results = [];
    
    for (let i = 0; i < testMessages.length; i++) {
        try {
            const result = await sendMessage(testMessages[i], i + 1);
            results.push(result);
            
            // Wait between messages to allow processing
            if (i < testMessages.length - 1) {
                console.log('⏳ Waiting 3 seconds before next message...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error(`❌ Failed to send message ${i + 1}:`, error.message);
            results.push({
                messageNumber: i + 1,
                message: testMessages[i],
                status: 'ERROR',
                response: error.message
            });
        }
    }

    console.log('\n📋 Test Results Summary:');
    results.forEach(result => {
        console.log(`${result.status === 200 ? '✅' : '❌'} Message ${result.messageNumber}: ${result.status}`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Check server logs for AI processing details');
    console.log('2. Go to your Dashboard → Chat to see AI responses');
    console.log('3. Verify that each AI response uses context from previous messages');
    console.log('4. Look for conversation history being passed to AI');
    
    return results;
}

// Run the test
testConversationContinuity().catch(console.error);
