import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        console.log(`🔥 [USER-CHECK] Checking all user settings...`);
        
        // Get all user settings documents
        const userSettingsSnapshot = await db.collection('userSettings').get();
        
        if (userSettingsSnapshot.empty) {
            return NextResponse.json({
                success: false,
                error: 'No user settings found in database',
                totalUsers: 0
            });
        }
        
        const users = [];
        userSettingsSnapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                userId: doc.id,
                hasAI: !!data.ai,
                aiStatus: data.ai?.status || 'not configured',
                hasWhatsApp: !!data.whatsapp,
                whatsappStatus: data.whatsapp?.status || 'not configured',
                hasTrainingData: !!data.trainingData,
                // Don't expose sensitive data like API keys
                aiModel: data.ai?.model || 'none',
                apiKeyLength: data.ai?.apiKey?.length || 0
            });
        });
        
        console.log(`🔥 [USER-CHECK] Found ${users.length} users`);
        users.forEach(user => {
            console.log(`🔥 [USER-CHECK] User ${user.userId}: AI=${user.aiStatus}, WhatsApp=${user.whatsappStatus}`);
        });
        
        return NextResponse.json({
            success: true,
            totalUsers: users.length,
            users: users
        });
        
    } catch (error: any) {
        console.error(`🔥 [USER-CHECK] Error:`, error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
