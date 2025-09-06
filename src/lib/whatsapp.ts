
'use server';

import { db, FieldValue } from './firebase-admin';
import axios from 'axios';
import * as admin from 'firebase-admin';

/**
 * Retrieves the WhatsApp credentials for a given user from Firestore.
 */
export async function getWhatsAppCredentials(userId: string) {
    const userSettingsRef = db.doc(`userSettings/${userId}`);
    const docSnap = await userSettingsRef.get();

    if (!docSnap.exists) {
        throw new Error(`User settings not found for user ID: ${userId}`);
    }

    const userData = docSnap.data();
    if (!userData || !userData.whatsapp) {
        throw new Error(`WhatsApp credentials not configured for user ID: ${userId}`);
    }

    const { phoneNumberId, accessToken, webhookSecret } = userData.whatsapp;
    
    // This function returns all credentials, but downstream consumers should
    // only check for the ones they specifically need.
    
    return { phoneNumberId, accessToken, webhookSecret };
}


/**
 * Stores a sent message in Firestore and updates the conversation metadata.
 */
async function storeSentMessage(userId: string, conversationId: string, messageData: any) {
    const conversationRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId);
    const messagesColRef = conversationRef.collection('messages');
    
    const batch = db.batch();

    batch.set(conversationRef, {
        lastUpdated: FieldValue.serverTimestamp(),
        lastMessage: messageData.caption || messageData.content || `[${messageData.type}]`,
        customerNumber: conversationId
    }, { merge: true });

    const newMessageRef = messagesColRef.doc();
    batch.set(newMessageRef, messageData);

    await batch.commit();
}


/**
 * Sends a message via the WhatsApp API and stores it in Firestore.
 */
export async function sendWhatsAppMessage(userId: string, to: string, messageData: { type: string, [key: string]: any }) {
    console.log(`Attempting to send ${messageData.type} message to ${to} for user ${userId}`);
    const { phoneNumberId, accessToken } = await getWhatsAppCredentials(userId);

     if (!phoneNumberId || !accessToken) {
        throw new Error("Cannot send message. Missing Phone Number ID or Access Token.");
    }

    const apiPayload = {
      messaging_product: 'whatsapp',
      to: to,
      ...messageData
    };

    const response = await axios.post(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, apiPayload, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    console.log('✅ Message sent successfully via API, now storing in DB.');

    let contentToStore;
    let captionToStore;

    if (messageData.type === 'text') {
        contentToStore = messageData.text.body;
    } else {
        contentToStore = messageData[messageData.type]?.filename || `[${messageData.type}]`;
        captionToStore = messageData[messageData.type]?.caption;
    }

    await storeSentMessage(userId, to, {
        sender: 'agent',
        content: contentToStore,
        caption: captionToStore,
        timestamp: FieldValue.serverTimestamp(),
        type: messageData.type,
        whatsappMessageId: response.data.messages[0].id
    });
    
    return response.data;
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
        headers: { 'Authorization': `Bearer ${accessToken}` },
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
