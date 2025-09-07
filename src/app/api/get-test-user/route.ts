import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        console.log('🔍 Finding test user...');
        
        const usersSnapshot = await db.collection('userSettings').limit(1).get();
        
        if (usersSnapshot.empty) {
            return NextResponse.json({
                success: false,
                message: "No users found in database"
            });
        }
        
        const testUser = usersSnapshot.docs[0];
        const userData = testUser.data();
        
        const result = {
            success: true,
            userId: testUser.id,
            hasAI: !!userData.ai,
            aiStatus: userData.ai?.status,
            hasApiKey: !!userData.ai?.apiKey,
            apiKeyLength: userData.ai?.apiKey?.length || 0,
            model: userData.ai?.model,
            hasTrainingData: !!userData.trainingData,
            hasWhatsApp: !!userData.whatsapp,
        };
        
        console.log('👤 Test user found:', result);
        
        return NextResponse.json(result);
        
    } catch (error: any) {
        console.error('❌ Failed to get test user:', error);
        
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
