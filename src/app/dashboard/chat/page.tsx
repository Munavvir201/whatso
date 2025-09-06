
'use client';

import { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat-list';
import { ChatView } from '@/components/chat-view';
import { Card } from '@/components/ui/card';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Chat } from '@/types/chat';

export default function ChatPage() {
  const { user } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Set the first chat as active by default
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, "userSettings", user.uid, "conversations"), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty && !activeChatId) {
            const firstChatId = querySnapshot.docs[0].id;
            setActiveChatId(firstChatId);
        }
    });
    return () => unsubscribe();
  }, [user, activeChatId]);

  // Fetch active chat details when ID changes
  useEffect(() => {
    if (!activeChatId || !user) {
      setActiveChat(null);
      return;
    }
    const docRef = doc(db, "userSettings", user.uid, "conversations", activeChatId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveChat({ 
            id: docSnap.id, 
            name: data.customerName || `Customer ${docSnap.id.slice(-4)}`,
            number: data.customerNumber || docSnap.id,
            avatar: `https://picsum.photos/seed/${docSnap.id}/40/40`,
            message: data.lastMessage || '',
            time: data.lastUpdated?.toDate().toLocaleTimeString() || '',
            unread: 0,
            active: true,
            ai_hint: 'person face'
        });
      } else {
        setActiveChat(null);
      }
    });
    return () => unsubscribe();
  }, [activeChatId, user]);

  return (
    <div className="h-full">
      <Card className="h-full w-full grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] overflow-hidden">
        <ChatList activeChatId={activeChatId} setActiveChatId={setActiveChatId} />
        <ChatView activeChat={activeChat} />
      </Card>
    </div>
  );
}
