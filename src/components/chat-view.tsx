
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Pencil, Send, Paperclip, Mic, MoreVertical, MessageSquare, ChevronLeft, Trash2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from './ui/skeleton';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, query, orderBy, Timestamp, doc, getDoc, setDoc, writeBatch, FieldValue } from 'firebase/firestore';
import type { Message, Chat } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import OpusMediaRecorder from 'opus-media-recorder';

interface ChatViewProps {
  activeChat: Chat | null;
  onBack?: () => void;
}

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

async function sendWhatsAppMediaMessage(userId: string, to: string, file: File | Blob, type: Message['type'], fileName?: string, caption?: string) {
    const userSettingsRef = doc(db, "userSettings", userId);
    const docSnap = await getDoc(userSettingsRef);
    if (!docSnap.exists() || !docSnap.data()?.whatsapp) throw new Error("WhatsApp credentials not configured.");
    const { phoneNumberId, accessToken } = docSnap.data()?.whatsapp;
    if (!phoneNumberId || !accessToken) throw new Error("Missing Phone Number ID or Access Token.");

    const formData = new FormData();
    formData.append('file', file, fileName || file.name || `file.${file.type.split('/')[1]}`);
    formData.append('type', file.type);
    formData.append('messaging_product', 'whatsapp');

    const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("WhatsApp media upload failed:", errorText);
        throw new Error(`Failed to upload media: ${errorText}`);
    }
    const { id: mediaId } = await uploadResponse.json();

    const messagePayload: any = {
        messaging_product: 'whatsapp',
        to: to,
        type: type,
        [type]: { id: mediaId },
    };
    
    if (caption && (type === 'image' || type === 'video' || type === 'document')) {
        messagePayload[type].caption = caption;
    }
    if (type === 'document' && fileName) {
        messagePayload[type].filename = fileName;
    }

    const sendResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
    });
    if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error("WhatsApp message send failed:", errorText);
        throw new Error(`Failed to send media message: ${errorText}`);
    }
    return await sendResponse.json();
}

async function sendWhatsAppTextMessage(userId: string, to: string, message: string) {
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
    return responseData;
}


const MessageContent = ({ message }: { message: Message }) => {
    switch (message.type) {
        case 'image':
            return (
                <div className="p-1">
                    {message.mediaUrl && (
                        <Image src={message.mediaUrl} alt={message.caption || 'Image'} width={300} height={300} className="rounded-md object-cover" />
                    )}
                    {message.caption && <p className="text-sm mt-2">{message.caption}</p>}
                </div>
            );
        case 'audio':
            return (
                <audio controls src={message.mediaUrl} className="w-full max-w-xs">
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
                <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5">
                    <Paperclip className="h-6 w-6 flex-shrink-0" />
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                        {message.content || 'Download Document'}
                    </a>
                </div>
            );
        case 'sticker':
             return message.mediaUrl ? <Image src={message.mediaUrl} alt="Sticker" width={128} height={128} /> : <span>[Sticker]</span>
        case 'text':
        default:
            return <p className='leading-snug whitespace-pre-wrap'>{message.content}</p>;
    }
};

export function ChatView({ activeChat, onBack }: ChatViewProps) {
    const { user } = useAuth();
    const { messages, isLoading } = useChatMessages(user?.uid || null, activeChat?.id || null);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const { toast } = useToast();

    useEffect(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, [messages]);

    useEffect(() => {
      if (isRecording) {
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
        setRecordingTime(0);
      }
      return () => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
    }, [isRecording]);

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
    
    const storeMessageInDb = async (messageData: Omit<Message, 'id' | 'timestamp'> & { timestamp: FieldValue, whatsappMessageId: string }) => {
        if (!user || !activeChat) return;

        const batch = writeBatch(db);
        const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
        const messagesRef = doc(collection(conversationRef, "messages"));

        batch.set(messagesRef, messageData);
        batch.update(conversationRef, {
            lastMessage: messageData.caption || messageData.content || `[${messageData.type}]`,
            lastUpdated: messageData.timestamp,
        });

        await batch.commit();
    };

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || !user) return;
        
        setIsSending(true);
        const messageContent = newMessage;
        setNewMessage("");

        try {
            const response = await sendWhatsAppTextMessage(user.uid, activeChat.id, messageContent);
            await storeMessageInDb({
                sender: 'agent',
                content: messageContent,
                type: 'text',
                timestamp: Timestamp.now(),
                whatsappMessageId: response.messages[0].id
            });

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Failed to Send Message",
                description: error.message,
            });
            setNewMessage(messageContent);
        } finally {
            setIsSending(false);
        }
    }
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !activeChat) return;

        setIsSending(true);
        try {
            let type: Message['type'] = 'document';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            const response = await sendWhatsAppMediaMessage(user.uid, activeChat.id, file, type, file.name);
            
            const dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            await storeMessageInDb({
                sender: 'agent',
                content: file.name,
                type: type,
                mediaUrl: dataUri,
                mimeType: file.type,
                timestamp: Timestamp.now(),
                whatsappMessageId: response.messages[0].id,
            });

        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to send file", description: error.message });
        } finally {
            setIsSending(false);
        }
        if (event.target) event.target.value = '';
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/ogg;codecs=opus' };
            const workerUrl = new URL('opus-media-recorder/encoderWorker.umd.js', import.meta.url).href;
            mediaRecorderRef.current = new OpusMediaRecorder(stream, options, { workerUrl });

            const chunks: BlobPart[] = [];
            mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setRecordedBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast({ variant: "destructive", title: "Microphone access denied", description: "Please enable microphone permissions in your browser." });
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
    };
    
    const cancelRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecordedBlob(null);
    }
    
    const sendRecording = async () => {
        if (!recordedBlob || !user || !activeChat) return;

        setIsSending(true);
        setIsRecording(false);

        try {
            const response = await sendWhatsAppMediaMessage(user.uid, activeChat.id, recordedBlob, 'audio');
            const dataUri = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(recordedBlob);
            });
            await storeMessageInDb({ sender: 'agent', type: 'audio', mediaUrl: dataUri, mimeType: recordedBlob.type, content: 'Voice message', timestamp: Timestamp.now(), whatsappMessageId: response.messages[0].id });
        } catch(e: any) {
             toast({ variant: "destructive", title: "Failed to send voice message", description: e.message });
        } finally {
            setIsSending(false);
            setRecordedBlob(null);
        }
    }
    
    useEffect(() => {
        if (isRecording && recordedBlob) {
            sendRecording();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recordedBlob]);

    const formatRecordingTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }


  if (!activeChat) {
    return (
        <div className="hidden md:flex flex-col h-full items-center justify-center bg-muted/20 text-muted-foreground">
            <MessageSquare size={48} />
            <p className="mt-4 text-lg">Select a conversation to start chatting</p>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between border-b p-3 flex-shrink-0 bg-background z-10">
         <div className="flex items-center gap-3">
           {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ChevronLeft className="h-6 w-6" />
            </Button>
           )}
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
                <span className="font-medium hidden sm:inline">AI Agent</span>
            </Label>
          </div>
          <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1" viewportRef={viewportRef}>
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
                                    "max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm shadow-sm",
                                    message.sender === 'agent' 
                                      ? "bg-chat-outgoing text-chat-outgoing-foreground" 
                                      : "bg-chat-incoming text-chat-incoming-foreground"
                                )}>
                                    <MessageContent message={message} />
                                    <span className={cn(
                                    "text-xs float-right mt-1 opacity-70",
                                     message.sender === 'agent' ? 'text-chat-outgoing-foreground' : 'text-chat-incoming-foreground'
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
      </div>
      <div className="p-4 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
        {isRecording ? (
            <div className="flex w-full items-center space-x-2">
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-destructive" onClick={cancelRecording}>
                    <Trash2 className="h-5 w-5" />
                    <span className="sr-only">Cancel recording</span>
                </Button>
                <div className="flex-1 bg-muted rounded-full h-10 flex items-center px-4">
                    <Circle className="h-3 w-3 text-destructive fill-destructive mr-2 animate-pulse" />
                    <span className="font-mono text-sm text-muted-foreground">{formatRecordingTime(recordingTime)}</span>
                </div>
                <Button type="button" size="icon" className="flex-shrink-0 bg-primary hover:bg-primary/90" onClick={stopRecording}>
                    <Send className="h-5 w-5 text-primary-foreground" />
                    <span className="sr-only">Send voice message</span>
                </Button>
            </div>
        ) : (
            <form className="flex w-full items-start space-x-2" onSubmit={handleSendTextMessage}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground mt-1" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Attach file</span>
                </Button>
                <Textarea
                    placeholder="Type a message..."
                    className="flex-1 min-h-[40px] max-h-32 resize-none bg-background border-border focus-visible:ring-1"
                    value={newMessage}
                    disabled={isSending}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendTextMessage(e);
                        }
                    }}
                />
                {newMessage.trim() ? (
                    <Button type="submit" size="icon" className="flex-shrink-0 bg-primary hover:bg-primary/90 mt-1" disabled={isSending}>
                        <Send className="h-5 w-5 text-primary-foreground" />
                        <span className="sr-only">Send</span>
                    </Button>
                ) : (
                    <Button type="button" size="icon" className="flex-shrink-0 bg-destructive hover:bg-destructive/90 mt-1" onClick={startRecording} disabled={isSending}>
                        <Mic className="h-5 w-5 text-destructive-foreground" />
                        <span className="sr-only">Record voice message</span>
                    </Button>
                )}
            </form>
        )}
      </div>
    </div>
  )
}
