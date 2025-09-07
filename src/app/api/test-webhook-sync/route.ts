import { NextRequest, NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase-admin';
import { generateSimpleAIResponse } from '@/ai/simple-ai';

export async function POST(req: NextRequest) {
    try {
        const userId = 'iAcgFJStySc2hQVQ7LvCboz2Wl02';
        const phoneNumber = '+1234567890';
        const messageText = 'I need urgent help with booking your premium service package. Please assist me!';
        
        console.log('🔄 Starting synchronous webhook test...');
        console.log(`📱 User: ${userId}`);
        console.log(`📞 Phone: ${phoneNumber}`);
        console.log(`💬 Message: ${messageText}`);
        
        // Step 1: Get user settings
        console.log('🔍 Step 1: Fetching user settings...');
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            return NextResponse.json({
                success: false,
                error: 'User settings not found',
                step: 1
            });
        }
        
        const settings = userSettingsDoc.data() || {};
        console.log(`✅ Step 1: User settings found`);
        
        // Step 2: Check AI enablement
        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        console.log(`🔍 Step 2: Global AI enabled: ${isGlobalAiEnabled}`);
        
        if (!isGlobalAiEnabled) {
            return NextResponse.json({
                success: false,
                error: 'AI not enabled globally',
                step: 2
            });
        }
        
        // Step 3: Check conversation AI settings
        console.log('🔍 Step 3: Checking conversation AI settings...');
        const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(phoneNumber).get();
        const isChatAiEnabled = !conversationDoc.exists || conversationDoc.data()?.isAiEnabled !== false;
        console.log(`✅ Step 3: Chat AI enabled: ${isChatAiEnabled}`);
        
        if (!isChatAiEnabled) {
            return NextResponse.json({
                success: false,
                error: 'AI not enabled for this conversation',
                step: 3
            });
        }
        
        // Step 4: Get AI credentials
        const apiKey = settings.ai?.apiKey;
        const modelName = settings.ai?.model;
        
        console.log(`🔍 Step 4: API Key length: ${apiKey?.length || 0}`);
        console.log(`🔍 Step 4: Model: ${modelName}`);
        
        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'API key missing',
                step: 4
            });
        }
        
        // Step 5: Get conversation history
        console.log('🔍 Step 5: Fetching conversation history...');
        const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(phoneNumber).collection('messages');
        const messagesSnapshot = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
        
        let conversationHistory = "No previous conversation history.";
        if (!messagesSnapshot.empty) {
            const messages = messagesSnapshot.docs.reverse().map(doc => {
                const data = doc.data();
                const sender = data.sender === 'customer' ? 'Customer' : 'Agent';
                const content = data.content || `[${data.type} message]`;
                return `${sender}: ${content}`;
            });
            conversationHistory = messages.join('\\n');
        }
        
        console.log(`✅ Step 5: Retrieved ${messagesSnapshot.size} previous messages`);
        
        // Step 6: Prepare training data
        const trainingContext = settings.trainingData || {};
        const fullTrainingData = `
          TRAINING DATA: ${trainingContext.clientData || ""}
          INSTRUCTIONS: ${trainingContext.trainingInstructions || ""}
          CHAT FLOW: ${trainingContext.chatFlow || ""}
        `.trim();
        
        console.log(`🔍 Step 6: Training data length: ${fullTrainingData.length} chars`);
        
        // Step 7: Generate AI response
        console.log('🤖 Step 7: Generating AI response...');
        const aiResult = await generateSimpleAIResponse({
            message: messageText,
            conversationHistory: conversationHistory,
            clientData: fullTrainingData,
            userApiKey: apiKey,
            userModel: modelName,
        });
        
        console.log(`✅ Step 7: AI response generated: "${aiResult.response.substring(0, 100)}..."`);
        
        // Step 8: Store the customer message
        console.log('💾 Step 8: Storing customer message...');
        const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(phoneNumber);
        const customerMessageRef = conversationRef.collection('messages').doc();
        
        await customerMessageRef.set({
            sender: 'customer',
            content: messageText,
            type: 'text',
            timestamp: FieldValue.serverTimestamp(),
            status: 'received',
        });
        
        console.log('✅ Step 8: Customer message stored');
        
        // Step 9: Store the AI response
        console.log('💾 Step 9: Storing AI response...');
        const agentMessageRef = conversationRef.collection('messages').doc();
        
        await agentMessageRef.set({
            sender: 'agent',
            content: aiResult.response,
            type: 'text',
            timestamp: FieldValue.serverTimestamp(),
            status: 'sent',
        });
        
        console.log('✅ Step 9: AI response stored');
        
        // Step 10: Update conversation metadata
        await conversationRef.set({
            lastUpdated: FieldValue.serverTimestamp(),
            lastMessage: aiResult.response,
            customerNumber: phoneNumber,
        }, { merge: true });
        
        console.log('✅ All steps completed successfully!');
        
        return NextResponse.json({
            success: true,
            result: {
                customerMessage: messageText,
                aiResponse: aiResult.response,
                conversationHistory: conversationHistory.substring(0, 200) + '...',
                trainingDataLength: fullTrainingData.length,
                model: modelName
            },
            message: 'Synchronous webhook test completed successfully!'
        });
        
    } catch (error: any) {
        console.error('❌ Synchronous webhook test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack?.substring(0, 1000) + '...'
            }
        }, { status: 500 });
    }
}
