
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Pencil, Send, User, Paperclip, Mic, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from './ui/skeleton';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, doc, getDoc, setDoc, FieldValue } from 'firebase/firestore';
import type { Message, Chat } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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


const MessageContent = ({ message }: { message: Message }) => {
    switch (message.type) {
        case 'image':
            return (
                <div className="p-1">
                    {message.mediaUrl && (
                        <Image src={message.mediaUrl} alt={message.caption || 'Image'} width={300} height={300} className="rounded-md" />
                    )}
                    {message.caption && <p className="text-sm mt-2">{message.caption}</p>}
                </div>
            );
        case 'audio':
            return (
                <audio controls src={message.mediaUrl} className="w-full">
                    Your browser does not support the audio element.
                </audio>
            );
        case 'video':
             return (
                <video controls src={message.mediaUrl} className="rounded-md max-w-xs">
                    Your browser does not support the video element.
                </video>
            );
        case 'document':
             return (
                <div className="flex items-center gap-3 p-3 rounded-lg">
                    <Paperclip className="h-6 w-6" />
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {message.content || 'Download Document'}
                    </a>
                </div>
            );
        case 'sticker':
             return message.mediaUrl ? <Image src={message.mediaUrl} alt="Sticker" width={128} height={128} /> : <span>[Sticker]</span>
        case 'text':
        default:
            return <p className='leading-snug'>{message.content}</p>;
    }
};

export function ChatView({ activeChat }: { activeChat: Chat | null }) {
    const { user } = useAuth();
    const { messages, isLoading } = useChatMessages(user?.uid || null, activeChat?.id || null);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
      if (scrollAreaRef.current) {
        const scrollDiv = scrollAreaRef.current.querySelector('div');
        if(scrollDiv) {
            scrollDiv.scrollTo({ top: scrollDiv.scrollHeight, behavior: 'smooth' });
        }
      }
    }, [messages]);

    const handleEditName = () => {
        if (!activeChat || !user) return;
        const newName = prompt("Enter new name for this contact:", activeChat.name);
        if (newName && newName.trim() !== "") {
            const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
            setDoc(conversationRef, { customerName: newName.trim() }, { merge: true })
                .then(() => {
                    toast({ title: "Name Updated", description: "The contact's name has been updated." });
                })
                .catch((error) => {
                    toast({ variant: "destructive", title: "Error", description: "Could not update the name." });
                });
        }
    };


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
                timestamp: Timestamp.now(),
                type: 'text'
            });

            // Also update the last message on the conversation
            await setDoc(conversationRef, {
                lastMessage: messageContent,
                lastUpdated: Timestamp.now() as FieldValue,
            }, { merge: true });

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
        <div className="flex flex-col h-full items-center justify-center bg-muted/40 text-muted-foreground">
            <MessageSquare size={48} />
            <p className="mt-4 text-lg">Select a conversation to start chatting</p>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-muted/40">
      <div className="flex items-center justify-between border-b p-3 flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={activeChat.avatar} alt={activeChat.name} data-ai-hint={activeChat.ai_hint}/>
            <AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className='flex items-center gap-1'>
                <h3 className="font-semibold text-lg">{activeChat.name}</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditName}>
                    <Pencil className='h-3 w-3 text-muted-foreground'/>
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">{activeChat.number}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch id="ai-mode" />
            <Label htmlFor="ai-mode" className="flex items-center gap-2 text-muted-foreground">
                <Bot className="h-5 w-5" />
                <span className="font-medium">AI Agent</span>
            </Label>
          </div>
          <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-0 overflow-y-auto" ref={scrollAreaRef}>
          <div className="p-4 md:p-6">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
                    <Skeleton className="h-20 w-3/4 rounded-lg" />
                    <Skeleton className="h-12 w-1/2 ml-auto rounded-lg" />
                    <Skeleton className="h-24 w-4/5 rounded-lg" />
                </div>
            ) : (
                <div className="space-y-2">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex w-full",
                                message.sender === 'agent' ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                message.sender === 'agent' ? "bg-chat-outgoing text-chat-outgoing-foreground" : "bg-chat-incoming text-chat-incoming-foreground"
                            )}>
                                <MessageContent message={message} />
                                <span className={cn(
                                  "text-xs float-right mt-1",
                                  message.sender === 'agent' ? 'text-chat-outgoing-foreground/70' : 'text-muted-foreground/80'
                                  )}>
                                   {formatTimestamp(message.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
      </ScrollArea>
      <div className="p-4 border-t flex-shrink-0 bg-background">
        <form className="flex w-full items-center space-x-2" onSubmit={handleSendMessage}>
            <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground">
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Attach file</span>
            </Button>
            <Textarea
                placeholder="Type your message here... (Shift+Enter for new line)"
                className="flex-1 min-h-[40px] max-h-32 resize-none bg-muted/40 border-muted-foreground/20 focus-visible:ring-1"
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
            {newMessage ? (
                <Button type="submit" size="icon" className="flex-shrink-0 bg-primary hover:bg-primary/90" disabled={isSending}>
                    <Send className="h-4 w-4 text-primary-foreground" />
                    <span className="sr-only">Send</span>
                </Button>
            ) : (
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground">
                    <Mic className="h-5 w-5" />
                    <span className="sr-only">Record voice message</span>
                </Button>
            )}
            
        </form>
      </div>
    </div>
  )
}
