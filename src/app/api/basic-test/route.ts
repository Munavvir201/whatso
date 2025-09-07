import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    console.log('🧪 Basic test endpoint called');
    
    try {
        // Test 1: Basic response
        console.log('✅ Basic endpoint working');
        
        // Test 2: Try to import genkit
        const { genkit } = await import('genkit');
        console.log('✅ Genkit imported');
        
        // Test 3: Try to import googleAI
        const { googleAI } = await import('@genkit-ai/googleai');
        console.log('✅ GoogleAI imported');
        
        return NextResponse.json({
            success: true,
            message: "All imports successful",
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('❌ Basic test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name
            }
        }, { status: 500 });
    }
}
