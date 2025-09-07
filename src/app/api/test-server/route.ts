import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const timestamp = new Date().toISOString();
    console.log(`🔥 [TEST-SERVER] Server is running! Timestamp: ${timestamp}`);
    
    return NextResponse.json({
        status: 'Server is running',
        timestamp,
        message: 'If you can see this, the server is working!'
    });
}

export async function POST(req: NextRequest) {
    const timestamp = new Date().toISOString();
    const body = await req.json().catch(() => ({}));
    
    console.log(`🔥 [TEST-SERVER-POST] POST request received at ${timestamp}`);
    console.log(`🔥 [TEST-SERVER-POST] Body:`, JSON.stringify(body, null, 2));
    
    return NextResponse.json({
        status: 'POST received',
        timestamp,
        receivedBody: body
    });
}
