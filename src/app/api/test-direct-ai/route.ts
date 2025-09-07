import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/ai/direct-ai';

export async function GET(req: NextRequest) {
    try {
        console.log('🧪 Testing direct AI implementation...');
        
        const testInput = {
            message: "Hello, I'm interested in your products",
            conversationHistory: "Customer: Hi\nAgent: Hello there! How can I help you?",
            clientData: "TRAINING DATA: We sell premium coffee beans\nINSTRUCTIONS: Be friendly and helpful\nCHAT FLOW: Greet, ask needs, provide info",
            userApiKey: "AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA",
            userModel: "gemini-pro"
        };
        
        console.log('📋 Test input prepared');
        
        const result = await generateAIResponse(testInput);
        
        console.log('✅ Direct AI test successful');
        
        return NextResponse.json({
            success: true,
            result: result,
            message: "Direct AI function works!"
        });
        
    } catch (error: any) {
        console.error('❌ Direct AI test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            }
        }, { status: 500 });
    }
}
