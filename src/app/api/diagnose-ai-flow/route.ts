import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateSimpleAIResponse } from '@/ai/simple-ai';

export async function GET(req: NextRequest) {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        steps: [],
        issues: [],
        success: false
    };

    try {
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
        
        // Step 1: Check user exists and has AI settings
        console.log('🔍 [1/7] Checking user settings...');
        const userDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userDoc.exists) {
            diagnostics.issues.push('User not found');
            return NextResponse.json(diagnostics, { status: 404 });
        }
        
        const userData = userDoc.data()!;
        diagnostics.steps.push('✅ User found');
        diagnostics.userSettings = {
            hasAI: !!userData.ai,
            aiStatus: userData.ai?.status,
            hasApiKey: !!userData.ai?.apiKey,
            hasWhatsApp: !!userData.whatsapp,
            whatsappStatus: userData.whatsapp?.status
        };
        
        // Step 2: Check AI configuration
        console.log('🔍 [2/7] Verifying AI configuration...');
        if (!userData.ai || userData.ai.status !== 'verified' || !userData.ai.apiKey) {
            diagnostics.issues.push('AI not properly configured or verified');
            diagnostics.steps.push('❌ AI configuration incomplete');
        } else {
            diagnostics.steps.push('✅ AI configuration valid');
        }
        
        // Step 3: Check WhatsApp configuration
        console.log('🔍 [3/7] Checking WhatsApp setup...');
        if (!userData.whatsapp) {
            diagnostics.issues.push('WhatsApp not configured');
            diagnostics.steps.push('❌ WhatsApp not configured');
        } else {
            diagnostics.steps.push('✅ WhatsApp configured');
        }
        
        // Step 4: Test AI response generation
        console.log('🔍 [4/7] Testing AI response generation...');
        try {
            const testMessage = "Hello, I need help with your products";
            const aiResult = await generateSimpleAIResponse({
                message: testMessage,
                conversationHistory: "Customer: Hi\nAgent: Hello there!",
                clientData: userData.trainingData ? 
                    `TRAINING DATA: ${userData.trainingData.clientData}\nINSTRUCTIONS: ${userData.trainingData.trainingInstructions}` : 
                    "No training data",
                userApiKey: userData.ai.apiKey,
                userModel: userData.ai.model
            });
            
            diagnostics.steps.push('✅ AI response generated successfully');
            diagnostics.testAIResponse = aiResult.response.substring(0, 100) + '...';
            
        } catch (aiError: any) {
            diagnostics.issues.push(`AI generation failed: ${aiError.message}`);
            diagnostics.steps.push('❌ AI generation failed');
        }
        
        // Step 5: Check if webhook endpoint exists
        console.log('🔍 [5/7] Testing webhook endpoint...');
        const webhookUrl = `http://localhost:3000/api/webhooks/whatsapp/${userId}`;
        try {
            const webhookTest = await fetch(webhookUrl, {
                method: 'GET'  // Test GET for verification
            });
            diagnostics.steps.push(`✅ Webhook endpoint accessible (${webhookTest.status})`);
        } catch (webhookError) {
            diagnostics.issues.push('Webhook endpoint not accessible');
            diagnostics.steps.push('❌ Webhook endpoint issues');
        }
        
        // Step 6: Check conversation settings
        console.log('🔍 [6/7] Checking conversation AI settings...');
        const testPhone = '+1234567890';
        const conversationDoc = await db.collection('userSettings')
            .doc(userId)
            .collection('conversations')
            .doc(testPhone)
            .get();
            
        const isChatAiEnabled = !conversationDoc.exists || conversationDoc.data()?.isAiEnabled !== false;
        diagnostics.steps.push(`✅ Chat AI enabled for conversations: ${isChatAiEnabled}`);
        
        // Step 7: Final assessment
        console.log('🔍 [7/7] Final assessment...');
        if (diagnostics.issues.length === 0) {
            diagnostics.success = true;
            diagnostics.steps.push('🎉 All systems ready - AI should be working');
            diagnostics.recommendation = 'Try sending a WhatsApp message and check your server console logs';
        } else {
            diagnostics.steps.push('⚠️ Issues found - need to be resolved');
            diagnostics.recommendation = 'Fix the issues listed above';
        }
        
        return NextResponse.json(diagnostics);
        
    } catch (error: any) {
        console.error('❌ Diagnostic failed:', error);
        diagnostics.issues.push(`Diagnostic error: ${error.message}`);
        return NextResponse.json(diagnostics, { status: 500 });
    }
}
