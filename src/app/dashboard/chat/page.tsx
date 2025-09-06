
'use client';

import { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat-list';
import { ChatView } from '@/components/chat-view';
import { Card } from '@/components/ui/card';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Chat } from '@/types/chat';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';


export default function ChatPage() {
  const { user } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const isMobile = useIsMobile();

  // Set the first chat as active by default on desktop
  useEffect(() => {
    if (!user || isMobile) return;
    
    const q = query(collection(db, "userSettings", user.uid, "conversations"), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty && !activeChatId) {
            const firstChatId = querySnapshot.docs[0].id;
            setActiveChatId(firstChatId);
        }
    });
    return () => unsubscribe();
  }, [user, activeChatId, isMobile]);

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
  
  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
  }

  const handleBack = () => {
    setActiveChatId(null);
    setActiveChat(null);
  }

  return (
      <Card className="w-full h-full grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] overflow-hidden">
        <div className={cn("md:flex flex-col", isMobile && activeChatId ? "hidden" : "flex")}>
          <ChatList activeChatId={activeChatId} setActiveChatId={handleSelectChat} />
        </div>
        <div className={cn("md:flex flex-col", isMobile && !activeChatId ? "hidden" : "flex")}>
           <ChatView activeChat={activeChat} onBack={isMobile ? handleBack : undefined} />
        </div>
      </Card>
  );
}
