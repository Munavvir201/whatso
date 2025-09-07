import { NextRequest, NextResponse } from 'next/server';
import { generateSimpleAIResponse } from '@/ai/simple-ai';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const message = searchParams.get('message') || 'Hello';
    const apiKey = searchParams.get('apiKey') || 'AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA';
    const model = searchParams.get('model') || 'gemini-2.0-flash';
    
    try {
        console.log('🧪 Testing AI with:', { message, model, apiKeyLength: apiKey.length });
        
        const result = await generateSimpleAIResponse({
            message,
            conversationHistory: 'No previous messages',
            clientData: 'Test data',
            userApiKey: apiKey,
            userModel: model
        });
        
        console.log('🧪 AI Test Result:', result);
        
        return NextResponse.json({
            success: true,
            result,
            testParams: { message, model, apiKeyLength: apiKey.length }
        });
        
    } catch (error: any) {
        console.error('🧪 AI Test Failed:', error);
        
        return NextResponse.json({
            success: false,
            error: error.message,
            testParams: { message, model, apiKeyLength: apiKey.length }
        }, { status: 500 });
    }
}
