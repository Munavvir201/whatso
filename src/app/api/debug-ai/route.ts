import { NextRequest, NextResponse } from 'next/server';
import { automateWhatsAppChat } from '@/ai/flows/automate-whatsapp-chat';

export async function GET(req: NextRequest) {
    try {
        console.log('🧪 Testing AI functionality...');
        
        // You need to have GOOGLE_GENERATIVE_AI_API_KEY in your environment or pass it here
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA';
        
        const testData = {
            message: "Hello, I'm interested in your products",
            conversationHistory: "Customer: Hello\nAgent: Hi there! How can I help you today?",
            clientData: "TRAINING DATA: We sell premium coffee beans\nINSTRUCTIONS: Be friendly and helpful\nCHAT FLOW: Greet, ask needs, provide info",
            apiKey: apiKey,
            model: 'gemini-pro'
        };
        
        console.log('📋 Test data:', JSON.stringify(testData, null, 2));
        
        const result = await automateWhatsAppChat(testData);
        
        console.log('✅ AI Test successful:', result);
        
        return NextResponse.json({ 
            success: true, 
            result,
            timestamp: new Date().toISOString() 
        });
        
    } catch (error: any) {
        console.error('❌ AI Test failed:', error);
        
        return NextResponse.json({ 
            success: false, 
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            },
            timestamp: new Date().toISOString() 
        }, { status: 500 });
    }
}
