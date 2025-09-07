import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

export async function GET(req: NextRequest) {
    const debugResults: any = {
        timestamp: new Date().toISOString(),
        steps: [],
        errors: [],
        success: false
    };

    try {
        // Step 1: Test basic AI function
        debugResults.steps.push("Step 1: Testing basic AI function...");
        console.log('🔍 Step 1: Testing basic AI function...');
        
        const testApiKey = 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA'; // fallback key
        
        const testInput = {
            message: "Hello, how are you?",
            conversationHistory: "Customer: Hi\nAgent: Hello there!",
            clientData: "TRAINING: Be friendly\nINSTRUCTIONS: Help customers",
            apiKey: testApiKey,
            model: 'gemini-pro'
        };

        console.log('📋 Test input:', JSON.stringify(testInput, null, 2));
        
        const aiResult = await automateWhatsAppChat(testInput);
        console.log('✅ AI Response received:', aiResult);
        
        debugResults.steps.push(`✅ AI function works: ${aiResult?.response?.substring(0, 100)}...`);
        debugResults.aiResult = aiResult;

        // Step 2: Test with a sample user ID from Firebase
        debugResults.steps.push("Step 2: Testing user settings retrieval...");
        console.log('🔍 Step 2: Testing user settings retrieval...');
        
        // Get all users to find a test user
        const usersSnapshot = await db.collection('userSettings').limit(1).get();
        
        if (!usersSnapshot.empty) {
            const testUserId = usersSnapshot.docs[0].id;
            const userData = usersSnapshot.docs[0].data();
            
            debugResults.steps.push(`Found test user: ${testUserId}`);
            debugResults.testUser = {
                id: testUserId,
                hasAI: !!userData.ai,
                aiStatus: userData.ai?.status,
                hasTrainingData: !!userData.trainingData
            };
            
            console.log('👤 Test user data:', debugResults.testUser);
            
            // Test AI settings
            if (userData.ai) {
                debugResults.steps.push("✅ User has AI settings");
                if (userData.ai.status === 'verified') {
                    debugResults.steps.push("✅ AI is verified");
                } else {
                    debugResults.steps.push(`⚠️ AI status: ${userData.ai.status}`);
                }
            } else {
                debugResults.steps.push("❌ User has no AI settings");
            }
            
            // Test training data
            if (userData.trainingData) {
                debugResults.steps.push("✅ User has training data");
            } else {
                debugResults.steps.push("⚠️ No training data");
            }
            
        } else {
            debugResults.steps.push("❌ No users found in database");
        }

        debugResults.success = true;
        
        return NextResponse.json(debugResults);
        
    } catch (error: any) {
        console.error('❌ Debug failed:', error);
        debugResults.errors.push({
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 500) + '...'
        });
        
        return NextResponse.json(debugResults, { status: 500 });
    }
}
