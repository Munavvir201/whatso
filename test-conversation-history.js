const https = require('https');

const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
const phoneNumber = "919876543210";

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

        console.log(`\n📨 Sending message ${messageNumber}: "${message}"`);
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log(`📬 Message ${messageNumber} response: ${res.statusCode} - ${responseData}`);
                resolve({
                    messageNumber,
                    message,
                    status: res.statusCode,
                    response: responseData
                });
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Message ${messageNumber} error:`, error.message);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function testWithIncreasingDelays() {
    console.log('🧪 Testing conversation history with increasing delays...\n');

    // Test 1: Send two messages quickly (1 second apart)
    console.log('=== TEST 1: Quick messages (1 second apart) ===');
    await sendMessage("Hello, I need help with pricing", 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage("Can you give me specific rates?", 2);
    
    console.log('\n⏳ Waiting 15 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Test 2: Send two messages with moderate delay (5 seconds apart)
    console.log('\n=== TEST 2: Moderate delay (5 seconds apart) ===');
    await sendMessage("What about delivery options?", 3);
    await new Promise(resolve => setTimeout(resolve, 5000));
    await sendMessage("How long does shipping take?", 4);
    
    console.log('\n⏳ Waiting 15 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Test 3: Send two messages with long delay (10 seconds apart)
    console.log('\n=== TEST 3: Long delay (10 seconds apart) ===');
    await sendMessage("Do you have bulk discounts?", 5);
    await new Promise(resolve => setTimeout(resolve, 10000));
    await sendMessage("What's the minimum order quantity?", 6);

    console.log('\n✅ All tests completed!');
    console.log('\n🎯 What to check:');
    console.log('1. Go to your dashboard and see if AI responded to ALL messages');
    console.log('2. Check if later AI responses reference earlier conversation');
    console.log('3. Look for patterns - does AI stop after certain timing?');
    console.log('4. Check server logs for any errors or timing issues');
}

// Run the test
testWithIncreasingDelays().catch(console.error);
