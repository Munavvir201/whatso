import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        console.log('🧪 Testing simple AI import...');
        
        // Try to import the AI function
        const { automateWhatsAppChat } = await import('@/ai/flows/automate-whatsapp-chat');
        
        console.log('✅ AI function imported successfully');
        
        const testInput = {
            message: "Hello",
            conversationHistory: "No history",
            clientData: "Test data",
            userApiKey: "AIzaSyAdrA35VXMLrh4BcWY4RogyAMxN8qwz3vA",
            userModel: "gemini-pro"
        };
        
        console.log('📋 Calling AI with test input...');
        const result = await automateWhatsAppChat(testInput);
        console.log('✅ AI result:', result);
        
        return NextResponse.json({
            success: true,
            result: result,
            message: "AI function works!"
        });
        
    } catch (error: any) {
        console.error('❌ Simple AI test failed:', error);
        
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
