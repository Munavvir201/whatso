import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

export async function POST(req: NextRequest) {
    const debugResults: any = {
        timestamp: new Date().toISOString(),
        steps: [],
        errors: [],
        success: false
    };

    try {
        const { userId, phoneNumber, message } = await req.json();
        
        if (!userId || !phoneNumber || !message) {
            throw new Error('Missing required parameters: userId, phoneNumber, message');
        }
        
        debugResults.testParams = { userId, phoneNumber, message };
        debugResults.steps.push(`Testing with user: ${userId}, phone: ${phoneNumber}`);
        
        // Step 1: Get user settings
        console.log(`🔍 [1/6] Fetching user settings for ${userId}...`);
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            throw new Error(`User settings not found for ${userId}`);
        }
        
        const settings = userSettingsDoc.data() || {};
        debugResults.steps.push('✅ User settings found');
        
        // Step 2: Check AI configuration
        console.log(`🔍 [2/6] Checking AI configuration...`);
        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        const apiKey = settings.ai?.apiKey;
        const modelName = settings.ai?.model || 'gemini-pro';
        
        debugResults.aiConfig = {
            isEnabled: isGlobalAiEnabled,
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey?.length || 0,
            model: modelName
        };
        
        if (!isGlobalAiEnabled) {
            throw new Error(`AI is not enabled/verified for user ${userId}`);
        }
        
        if (!apiKey) {
            throw new Error(`API key missing for user ${userId}`);
        }
        
        debugResults.steps.push('✅ AI configuration valid');
        
        // Step 3: Check conversation AI status
        console.log(`🔍 [3/6] Checking conversation AI status...`);
        const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(phoneNumber).get();
        const isChatAiEnabled = !conversationDoc.exists || conversationDoc.data()?.isAiEnabled !== false;
        
        debugResults.chatAiEnabled = isChatAiEnabled;
        
        if (!isChatAiEnabled) {
            throw new Error('AI is disabled for this specific conversation');
        }
        
        debugResults.steps.push('✅ Chat AI is enabled');
        
        // Step 4: Get conversation history
        console.log(`🔍 [4/6] Fetching conversation history...`);
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
        
        debugResults.conversationHistoryLength = conversationHistory.length;
        debugResults.steps.push(`✅ Retrieved conversation history (${conversationHistory.length} chars)`);
        
        // Step 5: Prepare training data
        console.log(`🔍 [5/6] Preparing training data...`);
        const trainingContext = settings.trainingData || {};
        const fullTrainingData = `
          TRAINING DATA: ${trainingContext.clientData || ""}
          INSTRUCTIONS: ${trainingContext.trainingInstructions || ""}
          CHAT FLOW: ${trainingContext.chatFlow || ""}
        `.trim();
        
        debugResults.trainingDataLength = fullTrainingData.length;
        debugResults.steps.push(`✅ Training data prepared (${fullTrainingData.length} chars)`);
        
        // Step 6: Call AI
        console.log(`🔍 [6/6] Calling AI with user's API key...`);
        const aiInput = {
            message: message,
            conversationHistory: conversationHistory,
            clientData: fullTrainingData,
            userApiKey: apiKey,
            userModel: modelName,
        };
        
        console.log('📋 AI Input:', JSON.stringify({...aiInput, userApiKey: `${apiKey.substring(0, 10)}...`}, null, 2));
        
        const aiResult = await automateWhatsAppChat(aiInput);
        
        debugResults.steps.push(`✅ AI responded: "${aiResult.response?.substring(0, 100)}..."`);
        debugResults.aiResponse = aiResult;
        
        debugResults.success = true;
        console.log('🎉 Full webhook test completed successfully!');
        
        return NextResponse.json(debugResults);
        
    } catch (error: any) {
        console.error('❌ Webhook test failed:', error);
        debugResults.errors.push({
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 1000) + '...'
        });
        
        return NextResponse.json(debugResults, { status: 500 });
    }
}
