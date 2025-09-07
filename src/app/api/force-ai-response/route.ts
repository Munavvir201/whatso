import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateSimpleAIResponse } from '@/ai/simple-ai';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'iAcgFJStySc2hQVQ7LvCboz2Wl02';
    const from = searchParams.get('from') || '+1234567890';
    const message = searchParams.get('message') || 'Hello, test the AI agent';
    
    try {
        console.log(`🚀 [FORCE-AI] Force testing AI response...`);
        console.log(`🚀 [FORCE-AI] UserId: ${userId}, From: ${from}, Message: "${message}"`);
        
        // Get user settings
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 });
        }
        
        const settings = userSettingsDoc.data() || {};
        
        // Force enable AI for testing
        const apiKey = settings.ai?.apiKey || 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA';
        const modelName = settings.ai?.model || 'gemini-2.0-flash';
        
        console.log(`🚀 [FORCE-AI] Using API key: ${apiKey.substring(0, 10)}..., Model: ${modelName}`);
        
        // Generate AI response
        const aiResult = await generateSimpleAIResponse({
            message: message,
            conversationHistory: 'No previous conversation',
            clientData: settings.trainingData?.clientData || 'No training data',
            userApiKey: apiKey,
            userModel: modelName,
        });
        
        console.log(`🚀 [FORCE-AI] AI Result:`, aiResult);
        
        if (aiResult && aiResult.response) {
            // Clean response
            const cleanResponse = aiResult.response.trim().replace(/\n+/g, ' ');
            
            // Try to send via WhatsApp API directly
            let whatsappSuccess = false;
            let whatsappError = null;
            
            try {
                const { phoneNumberId, accessToken } = await getWhatsAppCredentials(userId);
                
                const whatsappResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: from,
                        type: 'text',
                        text: { body: cleanResponse }
                    })
                });
                
                if (whatsappResponse.ok) {
                    whatsappSuccess = true;
                    console.log(`🚀 [FORCE-AI] ✅ WhatsApp message sent successfully!`);
                } else {
                    const errorData = await whatsappResponse.text();
                    whatsappError = `${whatsappResponse.status}: ${errorData}`;
                    console.error(`🚀 [FORCE-AI] ❌ WhatsApp send failed: ${whatsappError}`);
                }
            } catch (err: any) {
                whatsappError = err.message;
                console.error(`🚀 [FORCE-AI] ❌ WhatsApp send error:`, err);
            }
            
            // Store in database
            let dbSuccess = false;
            let dbError = null;
            
            try {
                await storeAgentMessage(userId, from, {
                    content: aiResult.response,
                    type: 'text',
                    sender: 'agent',
                    whatsappMessageId: null,
                });
                dbSuccess = true;
                console.log(`🚀 [FORCE-AI] ✅ Message stored in database successfully!`);
            } catch (err: any) {
                dbError = err.message;
                console.error(`🚀 [FORCE-AI] ❌ Database save failed:`, err);
            }
            
            return NextResponse.json({
                success: true,
                aiResponse: aiResult.response,
                whatsapp: {
                    success: whatsappSuccess,
                    error: whatsappError
                },
                database: {
                    success: dbSuccess,
                    error: dbError
                },
                message: 'AI agent test completed - check results above'
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'AI failed to generate response',
                aiResult
            });
        }
        
    } catch (error: any) {
        console.error(`🚀 [FORCE-AI] ❌ Test failed:`, error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

// Helper functions
async function getWhatsAppCredentials(userId: string) {
    const userSettingsRef = db.doc(`userSettings/${userId}`);
    const docSnap = await userSettingsRef.get();
    
    if (!docSnap.exists) {
        throw new Error(`User settings not found for user ID: ${userId}`);
    }
    
    const userData = docSnap.data();
    if (!userData || !userData.whatsapp) {
        throw new Error(`WhatsApp credentials not configured for user ID: ${userId}`);
    }
    
    return userData.whatsapp;
}

async function storeAgentMessage(userId: string, conversationId: string, messageData: any) {
    const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
    const messagesCol = conversationRef.collection('messages');
    const messageRef = messagesCol.doc();
    
    const batch = db.batch();
    batch.set(messageRef, {
        ...messageData,
        timestamp: db.FieldValue.serverTimestamp(),
        status: 'sent',
    });
    
    batch.set(conversationRef, {
        lastUpdated: db.FieldValue.serverTimestamp(),
        lastMessage: messageData.content || `[${messageData.type}]`,
    }, { merge: true });
    
    await batch.commit();
}
