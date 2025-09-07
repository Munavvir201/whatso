import { NextRequest, NextResponse } from 'next/server';
import { generateSimpleAIResponse } from '@/ai/simple-ai';

export async function GET(req: NextRequest) {
    try {
        console.log('🧪 Testing simple AI implementation...');
        
        const testInput = {
            message: "Hello, I need help with your services",
            conversationHistory: "Customer: Hi there\nAgent: Hello! Welcome",
            clientData: "We offer premium consulting services",
            userApiKey: "AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA",
            userModel: "gemini-2.5-flash"
        };
        
        console.log('📋 Calling simple AI...');
        const result = await generateSimpleAIResponse(testInput);
        
        return NextResponse.json({
            success: true,
            result: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('❌ Test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name
            }
        }, { status: 500 });
    }
}
