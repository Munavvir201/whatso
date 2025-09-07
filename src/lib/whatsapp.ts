
'use server';

import { db, FieldValue } from './firebase-admin';
import axios from 'axios';
import * as admin from 'firebase-admin';

type CredentialKey = 'phoneNumberId' | 'accessToken' | 'webhookSecret';

/**
 * Retrieves specific WhatsApp credentials for a given user from Firestore.
 * This is more efficient as it only fetches what's needed.
 */
export async function getWhatsAppCredentials(userId: string, requiredKeys: CredentialKey[]): Promise<Record<CredentialKey, string>> {
    const userSettingsRef = db.doc(`userSettings/${userId}`);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists) {
        throw new Error(`User settings not found for user ID: ${userId}`);
    }

    const userData = docSnap.data();
    if (!userData || !userData.whatsapp) {
        throw new Error(`WhatsApp credentials not configured for user ID: ${userId}`);
    }

    const credentials = userData.whatsapp;
    const result: Partial<Record<CredentialKey, string>> = {};

    for (const key of requiredKeys) {
        if (!credentials[key] || typeof credentials[key] !== 'string' || credentials[key].trim() === '') {
            throw new Error(`Missing or invalid WhatsApp credential: ${key} for user ID: ${userId}`);
        }
        result[key] = credentials[key];
    }
    
    return result as Record<CredentialKey, string>;
}


/**
 * Sends a message via the WhatsApp API and stores it in Firestore.
 */
export async function sendWhatsAppMessage(userId: string, to: string, messageData: { type: string, [key: string]: any }) {
    console.log(`🔥 [WHATSAPP-SEND] Starting send process...`);
    console.log(`🔥 [WHATSAPP-SEND] - User: ${userId}`);
    console.log(`🔥 [WHATSAPP-SEND] - To: ${to}`);
    console.log(`🔥 [WHATSAPP-SEND] - MessageData:`, JSON.stringify(messageData, null, 2));
    
    try {
        const { phoneNumberId, accessToken } = await getWhatsAppCredentials(userId, ['phoneNumberId', 'accessToken']);
        
        console.log(`🔥 [WHATSAPP-SEND] - Phone Number ID: ${phoneNumberId}`);
        console.log(`🔥 [WHATSAPP-SEND] - Access Token Length: ${accessToken.length}`);
        console.log(`🔥 [WHATSAPP-SEND] - Access Token Preview: ${accessToken.substring(0, 20)}...`);

        if (!phoneNumberId || !accessToken) {
            throw new Error("Cannot send message. Missing Phone Number ID or Access Token.");
        }

        const apiPayload = {
            messaging_product: 'whatsapp',
            to: to,
            ...messageData
        };
        
        console.log(`🔥 [WHATSAPP-SEND] Final API payload:`, JSON.stringify(apiPayload, null, 2));
        console.log(`🔥 [WHATSAPP-SEND] API URL: https://graph.facebook.com/v20.0/${phoneNumberId}/messages`);

        const response = await axios.post(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, apiPayload, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
        });
        
        console.log(`🔥 [WHATSAPP-SEND] ✅ Message sent successfully!`);
        console.log(`🔥 [WHATSAPP-SEND] Response:`, JSON.stringify(response.data, null, 2));
        
        return response.data;
        
    } catch (error: any) {
        console.error(`🔥 [WHATSAPP-SEND] 🔴 Send failed:`);
        console.error(`🔥 [WHATSAPP-SEND] Error status: ${error.response?.status}`);
        console.error(`🔥 [WHATSAPP-SEND] Error data:`, JSON.stringify(error.response?.data, null, 2));
        console.error(`🔥 [WHATSAPP-SEND] Error message: ${error.message}`);
        console.error(`🔥 [WHATSAPP-SEND] Full error:`, error);
        
        throw error;
    }
}


/**
 * Downloads media from Meta's servers and returns it as a base64 data URI.
 */
export async function downloadMediaAsDataUri(mediaId: string, accessToken: string): Promise<{ dataUri: string, mimeType: string }> {
    // 1. Get the media URL from Meta
    const urlResponse = await axios.get(`https://graph.facebook.com/v20.0/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!urlResponse.data.url) {
        throw new Error(`Failed to get media URL for ID: ${mediaId}`);
    }
    const mediaUrl = urlResponse.data.url;
    
    // 2. Download the media file using the obtained URL
    const downloadResponse = await axios.get(mediaUrl, {
        headers: { 'Authorization': 'Bearer ' + accessToken },
        responseType: 'arraybuffer' // Important to get the response as a buffer
    });

    const mimeType = downloadResponse.headers['content-type'];
    if (!mimeType) {
        throw new Error('Could not determine MIME type of downloaded media.');
    }

    // 3. Convert the binary data to a base64 data URI
    const base64Data = Buffer.from(downloadResponse.data).toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    return { dataUri, mimeType };
}

    