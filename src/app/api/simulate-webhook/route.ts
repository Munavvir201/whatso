import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    const debugResults: any = {
        timestamp: new Date().toISOString(),
        steps: [],
        errors: [],
        success: false
    };

    try {
        const body = await req.json();
        const userId = body.userId || 'test-user';
        const phoneNumber = body.phoneNumber || '+1234567890';
        const messageText = body.message || 'Hello, this is a test message';
        
        debugResults.testParams = { userId, phoneNumber, messageText };
        
        // Simulate the exact webhook flow
        debugResults.steps.push("Step 1: Simulating message storage...");
        console.log(`🔍 Step 1: Simulating message for user ${userId} from ${phoneNumber}`);
        
        // Step 2: Check user settings
        debugResults.steps.push("Step 2: Checking user settings...");
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            debugResults.steps.push(`❌ User settings not found for ${userId}`);
            debugResults.errors.push("User settings not found");
            return NextResponse.json(debugResults, { status: 400 });
        }
        
        const settings = userSettingsDoc.data() || {};
        debugResults.userSettings = {
            hasAI: !!settings.ai,
            aiStatus: settings.ai?.status,
            hasTrainingData: !!settings.trainingData,
            hasWhatsApp: !!settings.whatsapp
        };
        
        const isGlobalAiEnabled = settings.ai?.status === 'verified';
        debugResults.steps.push(`Step 3: Global AI enabled: ${isGlobalAiEnabled}`);
        
        // Step 4: Check conversation settings
        debugResults.steps.push("Step 4: Checking conversation settings...");
        const conversationDoc = await db.collection('userSettings').doc(userId).collection('conversations').doc(phoneNumber).get();
        const isChatAiEnabled = !conversationDoc.exists || conversationDoc.data()?.isAiEnabled !== false;
        debugResults.steps.push(`Step 5: Chat AI enabled: ${isChatAiEnabled}`);
        
        if (isGlobalAiEnabled && isChatAiEnabled) {
            debugResults.steps.push("Step 6: ✅ AI is enabled, would attempt to generate response");
            
            const apiKey = settings.ai?.apiKey;
            const modelName = settings.ai?.model;
            
            debugResults.aiConfig = {
                hasApiKey: !!apiKey,
                apiKeyLength: apiKey?.length || 0,
                model: modelName
            };
            
            if (!apiKey) {
                debugResults.steps.push("❌ API key is missing");
                debugResults.errors.push("API key is missing");
            } else {
                debugResults.steps.push(`✅ API key available (${apiKey.length} chars)`);
                debugResults.steps.push(`✅ Model: ${modelName}`);
            }
            
        } else {
            debugResults.steps.push("❌ AI is disabled for this user or chat");
            debugResults.errors.push("AI is disabled");
        }
        
        debugResults.success = true;
        return NextResponse.json(debugResults);
        
    } catch (error: any) {
        console.error('❌ Webhook simulation failed:', error);
        debugResults.errors.push({
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 500) + '...'
        });
        
        return NextResponse.json(debugResults, { status: 500 });
    }
}
