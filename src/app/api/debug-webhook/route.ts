import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    return NextResponse.json({ 
        message: "Webhook debugger ready",
        timestamp: new Date().toISOString()
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        console.log('🔍 WEBHOOK DEBUG - Full request body:');
        console.log(JSON.stringify(body, null, 2));
        
        const value = body.entry?.[0]?.changes?.[0]?.value;
        
        if (value?.messages) {
            console.log('📩 INCOMING MESSAGE DETECTED:');
            console.log('From:', value.messages[0].from);
            console.log('Type:', value.messages[0].type);
            console.log('Content:', value.messages[0].text?.body || value.messages[0]);
            console.log('Contact:', value.contacts?.[0]?.profile?.name || 'Unknown');
        }
        
        if (value?.statuses) {
            console.log('📋 STATUS UPDATE:');
            console.log('Status:', value.statuses[0]);
        }
        
        return NextResponse.json({ 
            received: true,
            timestamp: new Date().toISOString(),
            hasMessages: !!value?.messages,
            hasStatuses: !!value?.statuses
        });
        
    } catch (error: any) {
        console.error('❌ Webhook debug failed:', error);
        return NextResponse.json({ 
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 400 });
    }
}
