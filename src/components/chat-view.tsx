
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from './ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import type { Message, Chat } from '@/types/chat';

const useChatMessages = (chatId: string | null) => {
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

export function ChatView({ activeChat }: { activeChat: Chat | null }) {
    const { messages, isLoading } = useChatMessages(activeChat?.id || null);
    const [newMessage, setNewMessage] = useState("");
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
      }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const messageData = {
            sender: 'ai', // In a real app, this might be the logged-in agent
            content: newMessage,
            timestamp: new Date()
        };
        
        await addDoc(collection(db, "chats", activeChat.id, "messages"), messageData);
        setNewMessage("");
    }

  if (!activeChat) {
    return (
        <div className="flex flex-col h-full items-center justify-center bg-background text-muted-foreground">
            <Bot size={48} />
            <p className="mt-4 text-lg">Select a conversation to start chatting</p>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={activeChat.avatar} alt={activeChat.name} data-ai-hint={activeChat.ai_hint}/>
            <AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{activeChat.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", activeChat.active ? "bg-green-500" : "bg-gray-400")}></span>
              {activeChat.active ? "Online" : "Offline"}
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
      </div>
      <div className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
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
                            <p className='leading-snug'>{message.content}</p>
                            <span className={cn("text-xs self-end", message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                               {formatTimestamp(message.timestamp)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </div>
      <div className="p-4 border-t flex-shrink-0">
        <form className="flex w-full items-center space-x-2" onSubmit={handleSendMessage}>
          <Textarea
            placeholder="Type your message here..."
            className="flex-1 min-h-[40px] max-h-32 resize-none"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                }
            }}
          />
          <Button type="submit" size="icon" className="flex-shrink-0 bg-accent hover:bg-accent/90">
            <Send className="h-4 w-4 text-accent-foreground" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
