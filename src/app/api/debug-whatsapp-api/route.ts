import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'iAcgFJStySc2hQVQ7LvCboz2Wl02';
    const testPhone = searchParams.get('phone') || '';
    
    try {
        console.log(`🔥 [WHATSAPP-DEBUG] Testing WhatsApp API for user: ${userId}`);
        
        // Get user settings
        const userSettingsDoc = await db.collection('userSettings').doc(userId).get();
        
        if (!userSettingsDoc.exists) {
            return NextResponse.json({ error: 'User settings not found' }, { status: 404 });
        }
        
        const settings = userSettingsDoc.data();
        const whatsappConfig = settings?.whatsapp;
        
        if (!whatsappConfig) {
            return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 });
        }
        
        console.log(`🔥 [WHATSAPP-DEBUG] WhatsApp config:`, {
            hasPhoneNumberId: !!whatsappConfig.phoneNumberId,
            phoneNumberId: whatsappConfig.phoneNumberId,
            hasAccessToken: !!whatsappConfig.accessToken,
            accessTokenLength: whatsappConfig.accessToken?.length || 0,
            accessTokenPreview: whatsappConfig.accessToken?.substring(0, 10) + '...',
            status: whatsappConfig.status
        });
        
        // Test API call to get phone number info
        const phoneNumberId = whatsappConfig.phoneNumberId;
        const accessToken = whatsappConfig.accessToken;
        
        if (!phoneNumberId || !accessToken) {
            return NextResponse.json({ 
                error: 'Missing phone number ID or access token',
                phoneNumberId: !!phoneNumberId,
                accessToken: !!accessToken 
            }, { status: 400 });
        }
        
        console.log(`🔥 [WHATSAPP-DEBUG] Testing API call to get phone number info...`);
        
        // Test API connection
        const testApiResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const apiResult = await testApiResponse.json();
        
        console.log(`🔥 [WHATSAPP-DEBUG] API test result:`, {
            status: testApiResponse.status,
            ok: testApiResponse.ok,
            result: apiResult
        });
        
        if (!testApiResponse.ok) {
            return NextResponse.json({
                success: false,
                error: 'WhatsApp API authentication failed',
                status: testApiResponse.status,
                apiError: apiResult,
                suggestions: [
                    'Check if your access token is valid',
                    'Verify your phone number ID is correct',
                    'Make sure your Meta app has WhatsApp permissions'
                ]
            });
        }
        
        // If we have a test phone, try to send a message
        if (testPhone) {
            console.log(`🔥 [WHATSAPP-DEBUG] Attempting to send test message to ${testPhone}...`);
            
            const messagePayload = {
                messaging_product: 'whatsapp',
                to: testPhone,
                text: { body: 'This is a test message from your WhatsApp automation.' }
            };
            
            const sendResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messagePayload)
            });
            
            const sendResult = await sendResponse.json();
            
            return NextResponse.json({
                success: sendResponse.ok,
                phoneNumberInfo: apiResult,
                messageTest: {
                    status: sendResponse.status,
                    ok: sendResponse.ok,
                    result: sendResult
                },
                testPhone: testPhone
            });
        }
        
        return NextResponse.json({
            success: true,
            phoneNumberInfo: apiResult,
            message: 'WhatsApp API is working. Add ?phone=YOUR_PHONE_NUMBER to test sending.'
        });
        
    } catch (error: any) {
        console.error(`🔥 [WHATSAPP-DEBUG] Error:`, error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
