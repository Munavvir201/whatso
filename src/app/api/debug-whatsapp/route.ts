import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
    try {
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
        
        console.log('🔍 Debugging WhatsApp API configuration...');
        
        // Get user's WhatsApp settings
        const userSettingsRef = doc(db, "userSettings", userId);
        const docSnap = await getDoc(userSettingsRef);
        
        if (!docSnap.exists()) {
            return NextResponse.json({
                success: false,
                error: "User settings not found"
            });
        }
        
        const userData = docSnap.data();
        const whatsappData = userData?.whatsapp;
        
        console.log('📋 WhatsApp configuration check:');
        console.log('Has WhatsApp config:', !!whatsappData);
        
        if (!whatsappData) {
            return NextResponse.json({
                success: false,
                error: "No WhatsApp configuration found",
                recommendation: "Go to Settings → WhatsApp and configure your credentials"
            });
        }
        
        const debugInfo = {
            success: true,
            whatsappConfig: {
                hasPhoneNumberId: !!whatsappData.phoneNumberId,
                phoneNumberIdLength: whatsappData.phoneNumberId?.length || 0,
                hasAccessToken: !!whatsappData.accessToken,
                accessTokenLength: whatsappData.accessToken?.length || 0,
                hasWebhookSecret: !!whatsappData.webhookSecret,
                status: whatsappData.status || 'unknown'
            },
            phoneNumberIdPreview: whatsappData.phoneNumberId ? 
                whatsappData.phoneNumberId.substring(0, 10) + '...' : 'Not set',
            accessTokenPreview: whatsappData.accessToken ? 
                whatsappData.accessToken.substring(0, 10) + '...' : 'Not set'
        };
        
        console.log('📋 Debug info:', debugInfo);
        
        // Test API call to WhatsApp
        if (whatsappData.phoneNumberId && whatsappData.accessToken) {
            console.log('🧪 Testing WhatsApp API connection...');
            
            try {
                const testResponse = await fetch(`https://graph.facebook.com/v20.0/${whatsappData.phoneNumberId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${whatsappData.accessToken}`
                    }
                });
                
                debugInfo.apiTest = {
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    success: testResponse.ok
                };
                
                if (!testResponse.ok) {
                    const errorData = await testResponse.json();
                    debugInfo.apiError = errorData;
                    console.log('❌ WhatsApp API error:', errorData);
                }
                
            } catch (apiError: any) {
                debugInfo.apiTest = {
                    error: apiError.message
                };
                console.log('❌ WhatsApp API connection failed:', apiError);
            }
        }
        
        return NextResponse.json(debugInfo);
        
    } catch (error: any) {
        console.error('❌ WhatsApp debug failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name
            }
        }, { status: 500 });
    }
}
