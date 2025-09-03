"use client";

import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from './ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Timestamp;
}

const useChatMessages = (chatId: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!chatId) {
            setIsLoading(false);
            setMessages([]);
            return;
        };

        setIsLoading(true);
        const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const messagesData: Message[] = [];
            querySnapshot.forEach((doc) => {
                messagesData.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(messagesData);
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching messages for chat ${chatId}: `, error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [chatId]);

    return { messages, isLoading };
};

const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatView() {
    // In a real app, the activeChatId would come from component props or a global state.
    const activeChatId = '1'; 
    const { messages, isLoading } = useChatMessages(activeChatId);

  return (
    <div className="flex flex-col h-full bg-background">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src="https://picsum.photos/seed/p1/40/40" alt="John Doe" data-ai-hint="man portrait"/>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">John Doe</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Online
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="ai-mode" defaultChecked />
          <Label htmlFor="ai-mode" className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Mode</span>
          </Label>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-20rem)] p-6">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
                    <Skeleton className="h-20 w-3/4 rounded-lg" />
                    <Skeleton className="h-12 w-1/2 ml-auto rounded-lg" />
                    <Skeleton className="h-24 w-4/5 rounded-lg" />
                </div>
            ) : (
                <div className="space-y-6">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-4 py-3 text-sm",
                                message.sender === 'user' ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                            )}
                        >
                            {message.content}
                            <span className={cn("text-xs self-end", message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                               {formatTimestamp(message.timestamp)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form className="flex w-full items-center space-x-2">
          <Textarea
            placeholder="Type your message here..."
            className="flex-1 min-h-[40px] max-h-32 resize-none"
          />
          <Button type="submit" size="icon" className="flex-shrink-0 bg-accent hover:bg-accent/90">
            <Send className="h-4 w-4 text-accent-foreground" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </div>
  )
}
