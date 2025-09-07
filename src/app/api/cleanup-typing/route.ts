import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { userId, conversationId } = await req.json();
        
        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        console.log(`🧹 [CLEANUP] Starting typing indicator cleanup for user ${userId}${conversationId ? `, conversation ${conversationId}` : ' (all conversations)'}`);
        
        let cleanedCount = 0;
        
        if (conversationId) {
            // Clean specific conversation
            const messagesRef = db.collection('userSettings').doc(userId).collection('conversations').doc(conversationId).collection('messages');
            const typingQuery = messagesRef.where('type', '==', 'typing').where('sender', '==', 'agent');
            const typingSnapshot = await typingQuery.get();
            
            if (!typingSnapshot.empty) {
                const deletePromises = typingSnapshot.docs.map(doc => doc.ref.delete());
                await Promise.all(deletePromises);
                cleanedCount = typingSnapshot.docs.length;
                console.log(`🧹 [CLEANUP] ✅ Removed ${cleanedCount} typing indicators from conversation ${conversationId}`);
            }
        } else {
            // Clean all conversations for user
            const conversationsRef = db.collection('userSettings').doc(userId).collection('conversations');
            const conversationsSnapshot = await conversationsRef.get();
            
            for (const convDoc of conversationsSnapshot.docs) {
                const messagesRef = convDoc.ref.collection('messages');
                const typingQuery = messagesRef.where('type', '==', 'typing').where('sender', '==', 'agent');
                const typingSnapshot = await typingQuery.get();
                
                if (!typingSnapshot.empty) {
                    const deletePromises = typingSnapshot.docs.map(doc => doc.ref.delete());
                    await Promise.all(deletePromises);
                    cleanedCount += typingSnapshot.docs.length;
                    console.log(`🧹 [CLEANUP] ✅ Removed ${typingSnapshot.docs.length} typing indicators from conversation ${convDoc.id}`);
                }
            }
        }
        
        return NextResponse.json({
            success: true,
            message: `Cleanup completed successfully`,
            cleanedCount: cleanedCount,
            scope: conversationId ? `conversation ${conversationId}` : 'all conversations'
        });
        
    } catch (error: any) {
        console.error('🧹 [CLEANUP] ❌ Cleanup failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Allow GET requests for quick cleanup
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'iAcgFJStySc2hQVQ7LvCboz2Wl02';
    const conversationId = searchParams.get('conversationId');
    
    return POST(new NextRequest(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, conversationId })
    }));
}
