
"use client";

import React, { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chat } from '@/types/chat';

const useChatList = () => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "chats"), orderBy("time", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const chatsData: Chat[] = [];
            querySnapshot.forEach((doc) => {
                chatsData.push({ id: doc.id, ...doc.data() } as Chat);
            });
            setChats(chatsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching chats: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { chats, isLoading };
};

export function ChatList({ activeChatId, setActiveChatId }: { activeChatId: string | null, setActiveChatId: (id: string) => void }) {
  const { chats, isLoading } = useChatList();
  
  return (
    <div className="border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-headline font-semibold">Conversations</h2>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-10" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors",
                  chat.id === activeChatId ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint={chat.ai_hint} />
                  <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{chat.message}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="flex items-center h-full">
                      <Badge variant="default" className="bg-primary h-5 w-5 flex items-center justify-center p-0">{chat.unread}</Badge>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
