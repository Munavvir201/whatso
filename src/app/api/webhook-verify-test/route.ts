import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    
    console.log(`🔥 [WEBHOOK-VERIFY] Received:`, { mode, token, challenge });
    
    if (mode === 'subscribe' && challenge) {
        console.log(`🔥 [WEBHOOK-VERIFY] ✅ Verification successful, returning challenge: ${challenge}`);
        return new Response(challenge, { 
            status: 200, 
            headers: { 'Content-Type': 'text/plain' } 
        });
    }
    
    console.log(`🔥 [WEBHOOK-VERIFY] ❌ Invalid verification request`);
    return NextResponse.json({ error: 'Invalid verification' }, { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const timestamp = new Date().toISOString();
        
        console.log(`🔥 [WEBHOOK-TEST] ===== MESSAGE RECEIVED ${timestamp} =====`);
        console.log(`🔥 [WEBHOOK-TEST] Full body:`, JSON.stringify(body, null, 2));
        
        // Extract message info
        const value = body.entry?.[0]?.changes?.[0]?.value;
        
        if (value?.messages) {
            const message = value.messages[0];
            console.log(`🔥 [WEBHOOK-TEST] 📩 MESSAGE: From ${message.from}, Type: ${message.type}, Content: ${message.text?.body || 'N/A'}`);
        }
        
        return NextResponse.json({ status: 'received', timestamp });
        
    } catch (error: any) {
        console.error(`🔥 [WEBHOOK-TEST] Error:`, error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
