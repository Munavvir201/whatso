import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to see what Meta is sending in webhook verification
 * Use this to understand the exact format of Meta's requests
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const debugInfo = {
    message: 'Webhook debug endpoint - showing all received data',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    queryParams: Object.fromEntries(searchParams.entries()),
    specificParams: {
      hub_mode: searchParams.get('hub.mode'),
      hub_verify_token: searchParams.get('hub.verify_token'),
      hub_challenge: searchParams.get('hub.challenge'),
    },
    allSearchParams: searchParams.toString()
  };

  console.log('🔍 Webhook Debug Info:', JSON.stringify(debugInfo, null, 2));

  // For verification, Meta expects the challenge to be returned.
  // We'll return it, but also the debug info.
  const challenge = searchParams.get('hub.challenge');
  if (challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return NextResponse.json(debugInfo, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  
  const debugInfo = {
    message: 'Webhook debug endpoint - POST request',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    body: body,
    bodyParsed: (() => {
      try {
        return JSON.parse(body);
      } catch {
        return 'Could not parse as JSON';
      }
    })()
  };

  console.log('🔍 Webhook Debug Info (POST):', JSON.stringify(debugInfo, null, 2));

  return NextResponse.json(debugInfo, { status: 200 });
}
