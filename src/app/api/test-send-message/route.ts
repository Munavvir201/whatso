import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
        const testPhoneNumber = "+1234567890";  // This should be a valid WhatsApp number
        const testMessage = "Hello from the chat interface test!";
        
        console.log('🧪 Testing sendWhatsAppTextMessage function...');
        
        // Get user settings
        const userSettingsRef = doc(db, "userSettings", userId);
        const docSnap = await getDoc(userSettingsRef);
        
        if (!docSnap.exists() || !docSnap.data()?.whatsapp) {
            throw new Error("WhatsApp credentials not configured for this user.");
        }
        
        const { phoneNumberId, accessToken } = docSnap.data().whatsapp;
        
        if (!phoneNumberId || !accessToken) {
            throw new Error("Missing Phone Number ID or Access Token.");
        }
        
        console.log('📋 Using Phone Number ID:', phoneNumberId);
        console.log('📋 Access Token length:', accessToken.length);
        console.log('📋 Sending to:', testPhoneNumber);
        console.log('📋 Message:', testMessage);
        
        // Test the actual API call
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: testPhoneNumber,
                text: { body: testMessage },
            }),
        });
        
        console.log('📬 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error("❌ WhatsApp API error (JSON):", JSON.stringify(errorData, null, 2));
            } catch (jsonError) {
                const errorText = await response.text();
                console.error("❌ WhatsApp API error (text):", errorText);
                return NextResponse.json({
                    success: false,
                    error: `API error ${response.status}: ${errorText}`,
                    details: {
                        status: response.status,
                        statusText: response.statusText,
                        errorText: errorText
                    }
                });
            }
            
            return NextResponse.json({
                success: false,
                error: errorData.error?.message || `API error ${response.status}`,
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData
                }
            });
        }
        
        const responseData = await response.json();
        console.log('✅ Message sent successfully:', responseData);
        
        return NextResponse.json({
            success: true,
            message: "WhatsApp message sent successfully",
            response: responseData
        });
        
    } catch (error: any) {
        console.error('❌ Test send message failed:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack?.substring(0, 500)
            }
        }, { status: 500 });
    }
}
