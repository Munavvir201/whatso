
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
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, doc, getDoc, FieldValue } from 'firebase/firestore';
import type { Message, Chat } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

const useChatMessages = (userId: string | null, chatId: string | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!chatId || !userId) {
            setIsLoading(false);
            setMessages([]);
            return;
        };

        setIsLoading(true);
        const q = query(collection(db, "userSettings", userId, "conversations", chatId, "messages"), orderBy("timestamp", "asc"));
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
    }, [chatId, userId]);

    return { messages, isLoading };
};

const formatTimestamp = (timestamp: Timestamp | Date | null) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function sendWhatsAppMessage(userId: string, to: string, message: string) {
    const userSettingsRef = doc(db, "userSettings", userId);
    const docSnap = await getDoc(userSettingsRef);

    if (!docSnap.exists() || !docSnap.data()?.whatsapp) {
        throw new Error("WhatsApp credentials not configured for this user.");
    }

    const { phoneNumberId, accessToken } = docSnap.data()?.whatsapp;

    if (!phoneNumberId || !accessToken) {
        throw new Error("Missing Phone Number ID or Access Token.");
    }
    
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            text: { body: message },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send WhatsApp message:", errorData);
        throw new Error(errorData.error?.message || "Failed to send message via WhatsApp API.");
    }

    const responseData = await response.json();
    console.log("Successfully sent message:", responseData);
    return responseData;
}


export function ChatView({ activeChat }: { activeChat: Chat | null }) {
    const { user } = useAuth();
    const { messages, isLoading } = useChatMessages(user?.uid || null, activeChat?.id || null);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || !user) return;
        
        setIsSending(true);

        const messageContent = newMessage;
        setNewMessage("");

        try {
            // 1. Send via WhatsApp API
            await sendWhatsAppMessage(user.uid, activeChat.id, messageContent);

            // 2. Save to Firestore
            const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
            const messagesRef = collection(conversationRef, "messages");
            
            await addDoc(messagesRef, {
                sender: 'agent',
                content: messageContent,
                timestamp: Timestamp.now()
            });

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Failed to Send Message",
                description: error.message,
            });
            // If sending failed, put the message back in the input box
            setNewMessage(messageContent);
        } finally {
            setIsSending(false);
        }
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
          <Switch id="ai-mode" />
          <Label htmlFor="ai-mode" className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-5 w-5" />
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
                                message.sender === 'agent' ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                            )}
                        >
                            <p className='leading-snug'>{message.content}</p>
                            <span className={cn("text-xs self-end", message.sender === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
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
            placeholder="Type your message here... (Shift+Enter for new line)"
            className="flex-1 min-h-[40px] max-h-32 resize-none"
            value={newMessage}
            disabled={isSending}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                }
            }}
          />
          <Button type="submit" size="icon" className="flex-shrink-0 bg-accent hover:bg-accent/90" disabled={isSending}>
            <Send className="h-4 w-4 text-accent-foreground" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
