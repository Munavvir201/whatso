import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateSimpleAIResponse } from '@/ai/simple-ai';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const phoneNumber = searchParams.get('phone') || '';
    
    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    try {
        console.log(`🔍 [DEBUG] Starting AI flow debug for user: ${userId}`);
        
        // Step 1: Check user settings
        console.log(`🔍 [1] Fetching user settings...`);
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            return NextResponse.json({ 
                success: false, 
                error: 'User settings not found',
                step: 1
            });
        }
        
        const settings = userSettingsDoc.data() || {};
        console.log(`🔍 [1] User settings:`, {
            hasAI: !!settings.ai,
            aiStatus: settings.ai?.status,
            hasApiKey: !!settings.ai?.apiKey,
            apiKeyLength: settings.ai?.apiKey?.length,
            model: settings.ai?.model
        });
        
        // Step 2: Check AI global status
        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        console.log(`🔍 [2] Global AI enabled: ${isGlobalAiEnabled}`);
        
        if (!isGlobalAiEnabled) {
            return NextResponse.json({
                success: false,
                error: 'AI not globally enabled - status is not "verified"',
                step: 2,
                aiStatus: settings.ai?.status
            });
        }
        
        // Step 3: Check conversation AI status (if phone provided)
        let isChatAiEnabled = true;
        if (phoneNumber) {
            console.log(`🔍 [3] Checking conversation AI status for ${phoneNumber}...`);
            const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(phoneNumber).get();
            isChatAiEnabled = !conversationDoc.exists || conversationDoc.data()?.isAiEnabled !== false;
            console.log(`🔍 [3] Chat AI enabled for ${phoneNumber}: ${isChatAiEnabled}`);
        }
        
        if (!isChatAiEnabled) {
            return NextResponse.json({
                success: false,
                error: 'AI disabled for this specific chat',
                step: 3
            });
        }
        
        // Step 4: Get API key and model
        const apiKey = settings.ai?.apiKey || 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA';
        const modelName = settings.ai?.model || 'gemini-2.0-flash';
        
        console.log(`🔍 [4] Using API key length: ${apiKey.length}, model: ${modelName}`);
        
        // Step 5: Get training data
        const trainingContext = settings.trainingData || {};
        const fullTrainingData = `
          TRAINING DATA: ${trainingContext.clientData || ""}
          INSTRUCTIONS: ${trainingContext.trainingInstructions || ""}
          CHAT FLOW: ${trainingContext.chatFlow || ""}
        `.trim();
        
        console.log(`🔍 [5] Training data length: ${fullTrainingData.length}`);
        
        // Step 6: Test AI generation
        console.log(`🔍 [6] Testing AI generation...`);
        const testMessage = "Hello, this is a test message from webhook debug";
        const conversationHistory = phoneNumber ? await getConversationHistory(userId, phoneNumber) : "No previous conversation";
        
        const aiResult = await generateSimpleAIResponse({
            message: testMessage,
            conversationHistory,
            clientData: fullTrainingData,
            userApiKey: apiKey,
            userModel: modelName,
        });
        
        console.log(`🔍 [6] AI Result:`, aiResult);
        
        return NextResponse.json({
            success: true,
            steps: {
                step1_userSettings: { found: true, hasAI: !!settings.ai },
                step2_globalAI: { enabled: isGlobalAiEnabled, status: settings.ai?.status },
                step3_chatAI: { enabled: isChatAiEnabled },
                step4_credentials: { apiKeyLength: apiKey.length, model: modelName },
                step5_trainingData: { length: fullTrainingData.length },
                step6_aiGeneration: { success: true, response: aiResult.response }
            },
            aiResult
        });
        
    } catch (error: any) {
        console.error('🔍 [ERROR] Debug failed:', error);
        
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

async function getConversationHistory(userId: string, conversationId: string): Promise<string> {
    try {
        const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
        const messagesSnapshot = await messagesRef.orderBy('timestamp', 'desc').limit(10).get();
        
        if (messagesSnapshot.empty) {
            return "No previous conversation history.";
        }
        
        const messages = messagesSnapshot.docs.reverse().map(doc => {
            const data = doc.data();
            const sender = data.sender === 'customer' ? 'Customer' : 'Agent';
            const content = data.content || `[${data.type} message]`;
            return `${sender}: ${content}`;
        });
        
        return messages.join('\n');
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        return "Error retrieving conversation history.";
    }
}
