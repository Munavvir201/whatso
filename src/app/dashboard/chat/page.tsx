
'use client';

import { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat-list';
import { ChatView } from '@/components/chat-view';
import { Card } from '@/components/ui/card';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chat } from '@/types/chat';

export default function ChatPage() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Set the first chat as active by default
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("time", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty && !activeChatId) {
            const firstChatId = querySnapshot.docs[0].id;
            setActiveChatId(firstChatId);
        }
    });
    return () => unsubscribe();
  }, [activeChatId]);

  // Fetch active chat details when ID changes
  useEffect(() => {
    if (!activeChatId) {
      setActiveChat(null);
      return;
    }
    const docRef = doc(db, "chats", activeChatId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveChat({ id: docSnap.id, ...docSnap.data() } as Chat);
      } else {
        setActiveChat(null);
      }
    });
    return () => unsubscribe();
  }, [activeChatId]);

  return (
    <div className="h-full">
      <Card className="h-full w-full grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] overflow-hidden">
        <ChatList activeChatId={activeChatId} setActiveChatId={setActiveChatId} />
        <ChatView activeChat={activeChat} />
      </Card>
    </div>
  );
}
