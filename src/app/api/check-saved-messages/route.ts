import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET(req: NextRequest) {
    try {
        const userId = "iAcgFJStySc2hQVQ7LvCboz2Wl02";
        const phoneNumber = "+1234567890";
        
        console.log('🔍 Checking saved messages in Firestore...');
        
        // Get messages from the conversation
        const messagesRef = collection(db, "userSettings", userId, "conversations", phoneNumber, "messages");
        const messagesQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(10));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const messages: any[] = [];
        messagesSnapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                sender: data.sender,
                content: data.content,
                type: data.type,
                timestamp: data.timestamp?.toDate?.() || data.timestamp,
                status: data.status
            });
        });
        
        console.log(`📋 Found ${messages.length} messages in database`);
        
        const agentMessages = messages.filter(m => m.sender === 'agent');
        const customerMessages = messages.filter(m => m.sender === 'customer');
        
        const analysis = {
            totalMessages: messages.length,
            customerMessages: customerMessages.length,
            agentMessages: agentMessages.length,
            aiResponsesSaved: agentMessages.length > 0,
            latestMessages: messages.slice(0, 5).map(m => ({
                sender: m.sender,
                content: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : ''),
                timestamp: m.timestamp
            }))
        };
        
        console.log('📊 Message analysis:', analysis);
        
        return NextResponse.json({
            success: true,
            analysis: analysis,
            messages: messages,
            recommendation: agentMessages.length === 0 ? 
                "No AI responses found in database. Check server logs to see if AI is generating responses." :
                "AI responses are being saved to database successfully!"
        });
        
    } catch (error: any) {
        console.error('❌ Failed to check saved messages:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: error.message,
                name: error.name
            }
        }, { status: 500 });
    }
}
