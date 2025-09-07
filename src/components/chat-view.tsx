
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Pencil, Send, Paperclip, Mic, MoreVertical, MessageSquare, ChevronLeft, Trash2, Circle, Loader2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from './ui/skeleton';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, query, orderBy, Timestamp, doc, getDoc, setDoc, writeBatch, serverTimestamp, addDoc, updateDoc, limit, startAfter, getDocs } from 'firebase/firestore';
import type { Message, Chat } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
// Import OpusMediaRecorder with proper typing
let OpusMediaRecorder: any;
if (typeof window !== 'undefined') {
  OpusMediaRecorder = require('opus-media-recorder');
}

// Type declaration for opus-media-recorder
interface OpusMediaRecorderType {
  constructor: new (stream: MediaStream, options: any, config?: { workerUrl: string }) => OpusMediaRecorderInstance;
}

interface OpusMediaRecorderInstance {
  ondataavailable: ((event: BlobEvent) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
  state: string;
  stream: MediaStream;
}

interface ChatViewProps {
  activeChat: Chat | null;
  onBack?: () => void;
}

const MESSAGES_PER_PAGE = 20;

/**
 * Custom hook for chat messages with pagination
 * - Always loads the most recent messages first
 * - Shows latest messages at the bottom of the chat
 * - Loads older messages when scrolling up (infinite scroll)
 * - Preserves scroll position when loading older messages
 */
const useChatMessages = (userId: string | null, chatId: string | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const loadMoreMessages = useCallback(async () => {
        if (!userId || !chatId || isLoadingMore || !hasMoreMessages) return;
        
        setIsLoadingMore(true);
        try {
            const messagesRef = collection(db, "userSettings", userId, "conversations", chatId, "messages");
            let q;
            
            if (lastDoc) {
                q = query(
                    messagesRef,
                    orderBy("timestamp", "desc"),
                    startAfter(lastDoc),
                    limit(MESSAGES_PER_PAGE)
                );
            } else {
                // This shouldn't happen as we load initial messages differently
                return;
            }
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                setHasMoreMessages(false);
                return;
            }
            
            const olderMessages: Message[] = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            } as Message));
            
            // Reverse because we queried in desc order but want to display asc
            olderMessages.reverse();
            
            setMessages(prev => [...olderMessages, ...prev]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            
            if (snapshot.docs.length < MESSAGES_PER_PAGE) {
                setHasMoreMessages(false);
            }
        } catch (error) {
            console.error('Error loading more messages:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [userId, chatId, lastDoc, isLoadingMore, hasMoreMessages]);

    useEffect(() => {
        if (!userId || !chatId) {
            setIsLoading(true);
            setMessages([]);
            setHasMoreMessages(true);
            setLastDoc(null);
            return;
        }

        // Clean up previous subscription
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        setIsLoading(true);
        setMessages([]);
        setHasMoreMessages(true);
        setLastDoc(null);
        
        // First, get the most recent messages with real-time updates
        const messagesRef = collection(db, "userSettings", userId, "conversations", chatId, "messages");
        const recentMessagesQuery = query(
            messagesRef,
            orderBy("timestamp", "desc"),
            limit(MESSAGES_PER_PAGE)
        );
        
        const unsubscribe = onSnapshot(recentMessagesQuery, (querySnapshot) => {
            const recentMessages: Message[] = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            } as Message));
            
            // Reverse to show oldest first
            recentMessages.reverse();
            
            setMessages(recentMessages);
            setIsLoading(false);
            
            // Set up pagination
            if (querySnapshot.docs.length > 0) {
                setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
                setHasMoreMessages(querySnapshot.docs.length === MESSAGES_PER_PAGE);
            } else {
                setHasMoreMessages(false);
            }
        }, (error) => {
            console.error(`Error fetching messages for chat ${chatId}: `, error);
            setIsLoading(false);
        });
        
        unsubscribeRef.current = unsubscribe;
        return () => unsubscribe();
    }, [chatId, userId]);


    return { messages, isLoading, isLoadingMore, hasMoreMessages, setMessages, loadMoreMessages };
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
    formData.append('file', file, fileName || (file as File).name || `file.${file.type.split('/')[1]}`);
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
        let errorData;
        try {
            errorData = await response.json();
        } catch (jsonError) {
            const errorText = await response.text();
            console.error("Failed to send WhatsApp message (text response):", errorText);
            throw new Error(`WhatsApp API error ${response.status}: ${errorText || response.statusText}`);
        }
        console.error("Failed to send WhatsApp message (JSON response):", errorData);
        console.error("Response status:", response.status, response.statusText);
        throw new Error(errorData.error?.message || `WhatsApp API error ${response.status}: ${errorData.message || response.statusText}`);
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
    const { messages, isLoading, isLoadingMore, hasMoreMessages, setMessages, loadMoreMessages } = useChatMessages(user?.uid || null, activeChat?.id || null);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    const mediaRecorderRef = useRef<OpusMediaRecorderInstance | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();
    
    // State for the AI toggle
    const [isAiEnabledForChat, setIsAiEnabledForChat] = useState(true);
    const [isGlobalAiVerified, setIsGlobalAiVerified] = useState(false);


    // Fetch global AI status
    useEffect(() => {
        if (!user) return;
        const userSettingsRef = doc(db, "userSettings", user.uid);
        const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
            const isVerified = docSnap.data()?.ai?.status === 'verified';
            setIsGlobalAiVerified(isVerified);
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch and subscribe to per-chat AI status
    useEffect(() => {
        if (!user || !activeChat) return;
        const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
        const unsubscribe = onSnapshot(conversationRef, (docSnap) => {
            if (docSnap.exists()) {
                // Default to true if the field is not set
                setIsAiEnabledForChat(docSnap.data().isAiEnabled !== false);
            }
        });
        return () => unsubscribe();
    }, [user, activeChat]);
    

    const handleAiToggle = async (checked: boolean) => {
        if (!user || !activeChat) return;
        setIsAiEnabledForChat(checked); // Optimistic update
        const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
        try {
            await updateDoc(conversationRef, { isAiEnabled: checked });
             toast({
                title: `AI Agent ${checked ? 'Enabled' : 'Disabled'}`,
                description: `The AI will ${checked ? 'now respond' : 'no longer respond'} in this chat.`,
            });
        } catch (error) {
            console.error("Failed to update AI status for chat:", error);
            setIsAiEnabledForChat(!checked); // Revert on error
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not update AI status.",
            });
        }
    };


    useEffect(() => {
        if (activeChat && user) {
            const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
            // Reset unread count when chat is opened
            getDoc(conversationRef).then(docSnap => {
                if (docSnap.exists() && docSnap.data().unreadCount > 0) {
                    setDoc(conversationRef, { unreadCount: 0 }, { merge: true });
                }
            });
        }
    }, [activeChat, user]);
    
    // Scroll detection for pagination and position tracking
    const handleScroll = useCallback(() => {
        if (!viewportRef.current) return;
        
        const viewport = viewportRef.current;
        const scrollTop = viewport.scrollTop;
        const scrollHeight = viewport.scrollHeight;
        const clientHeight = viewport.clientHeight;
        
        // Check if user is at bottom (within 100px threshold)
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setIsUserAtBottom(isAtBottom);
        
        // Check if user scrolled near the top to load more messages
        if (scrollTop < 200 && hasMoreMessages && !isLoadingMore) {
            const previousScrollHeight = scrollHeight;
            loadMoreMessages().then(() => {
                // Maintain scroll position after loading older messages
                if (viewportRef.current) {
                    const newScrollHeight = viewportRef.current.scrollHeight;
                    const scrollDiff = newScrollHeight - previousScrollHeight;
                    viewportRef.current.scrollTop = scrollTop + scrollDiff;
                }
            });
        }
    }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);
    
    // Always scroll to bottom when chat loads or when switching chats - show latest messages
    useEffect(() => {
        if (!isLoading && viewportRef.current && messages.length > 0 && activeChat) {
            // Force scroll to bottom to show latest messages
            setTimeout(() => {
                if (viewportRef.current) {
                    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
                    setIsUserAtBottom(true);
                }
            }, 50);
        }
    }, [isLoading, activeChat?.id]);
    
    // Also scroll to bottom when new messages arrive in current chat
    useEffect(() => {
        if (!isLoading && viewportRef.current && messages.length > 0 && isUserAtBottom) {
            // Only auto-scroll if user is already at bottom (reading latest)
            setTimeout(() => {
                if (viewportRef.current && isUserAtBottom) {
                    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
                }
            }, 50);
        }
    }, [messages.length, isLoading, isUserAtBottom]);
    
    
    // Scroll to bottom function
    const scrollToBottom = useCallback(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ 
                top: viewportRef.current.scrollHeight, 
                behavior: 'smooth' 
            });
        }
    }, []);

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
    
    const storeMessageInDb = async (messageData: Omit<Message, 'id' | 'timestamp' | 'sender' | 'type'> & {type: Message['type'], sender: Message['sender']}) => {
         if (!user || !activeChat) return;

        const batch = writeBatch(db);
        const conversationRef = doc(db, "userSettings", user.uid, "conversations", activeChat.id);
        const messagesColRef = collection(conversationRef, "messages");
        
        batch.set(doc(messagesColRef), { ...messageData, timestamp: serverTimestamp()});

        batch.update(conversationRef, {
            lastMessage: messageData.caption || messageData.content || `[${messageData.type}]`,
            lastUpdated: serverTimestamp(),
        });

        await batch.commit();
    };

    const handleSendTextMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || !user) return;
        
        const messageContent = newMessage;
        setNewMessage("");

        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            sender: 'agent',
            content: messageContent,
            type: 'text',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setIsSending(true);

        try {
            const response = await sendWhatsAppTextMessage(user.uid, activeChat.id, messageContent);
            await storeMessageInDb({
                content: messageContent,
                type: 'text',
                sender: 'agent',
                whatsappMessageId: response.messages[0].id
            });

        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Failed to Send Message",
                description: error.message,
            });
            setNewMessage(messageContent);
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id)); // remove optimistic on fail
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
            
            const dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
             const optimisticMessage: Message = {
                id: `temp-${Date.now()}`,
                sender: 'agent',
                content: file.name,
                type: type,
                mediaUrl: dataUri,
                mimeType: file.type,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, optimisticMessage]);

            const response = await sendWhatsAppMediaMessage(user.uid, activeChat.id, file, type, file.name);
            
            await storeMessageInDb({
                sender: 'agent',
                content: file.name,
                type: type,
                mediaUrl: dataUri,
                mimeType: file.type,
                whatsappMessageId: response.messages[0].id,
            });

        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to send file", description: error.message });
            setMessages(prev => prev.filter(m => m.id.startsWith('temp-')));
        } finally {
            setIsSending(false);
        }
        if (event.target) event.target.value = '';
    };

    const sendRecording = useCallback(async (audioBlob: Blob) => {
        if (!audioBlob || !user || !activeChat) return;

        setIsSending(true);
        setIsRecording(false);
        
        const dataUri = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
        });

        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            sender: 'agent',
            type: 'audio',
            mediaUrl: dataUri,
            mimeType: audioBlob.type,
            content: 'Voice message',
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const response = await sendWhatsAppMediaMessage(user.uid, activeChat.id, audioBlob, 'audio');
            await storeMessageInDb({ sender: 'agent', type: 'audio', mediaUrl: dataUri, mimeType: audioBlob.type, content: 'Voice message', whatsappMessageId: response.messages[0].id });
        } catch(e: any) {
             toast({ variant: "destructive", title: "Failed to send voice message", description: e.message });
             setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        } finally {
            setIsSending(false);
        }
    }, [user, activeChat, toast, setMessages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/ogg;codecs=opus' };
            const workerUrl = new URL('opus-media-recorder/encoderWorker.umd.js', import.meta.url).href;
            mediaRecorderRef.current = new OpusMediaRecorder(stream, options, { workerUrl });

            const chunks: BlobPart[] = [];
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                    sendRecording(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
            }
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast({ variant: "destructive", title: "Microphone access denied", description: "Please enable microphone permissions in your browser." });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };
    
    const cancelRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            // A new onstop handler is set to just discard the data
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }
    
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
            <div
                className="flex items-center space-x-2"
                title={!isGlobalAiVerified ? "Global AI provider not verified. Go to Settings -> AI Provider." : ""}
            >
                <Switch 
                    id="ai-mode" 
                    checked={isAiEnabledForChat}
                    onCheckedChange={handleAiToggle}
                    disabled={!isGlobalAiVerified}
                />
                <Label htmlFor="ai-mode" className={cn("flex items-center gap-2", !isGlobalAiVerified ? "cursor-not-allowed text-muted-foreground" : "")}>
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
        <div className="flex-1 relative">
            <div 
                ref={viewportRef}
                className="absolute inset-0 overflow-y-auto"
                onScroll={handleScroll}
            >
                <div className="p-4 md:p-6">
                {/* Loading indicator for older messages */}
                {isLoadingMore && (
                    <div className="flex justify-center py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading older messages...</span>
                        </div>
                    </div>
                )}
                
                
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
                
                {/* End of messages indicator */}
                {!hasMoreMessages && messages.length > 0 && (
                    <div className="flex justify-center py-4">
                        <span className="text-xs text-muted-foreground">Beginning of conversation</span>
                    </div>
                )}
                </div>
            
                {/* Scroll to bottom button - shows when user is not at bottom */}
                {!isUserAtBottom && messages.length > 0 && (
                    <div className="absolute bottom-4 right-4 z-10">
                        <Button 
                            onClick={scrollToBottom}
                            className="rounded-full shadow-lg bg-primary hover:bg-primary/90 h-12 px-4 gap-2"
                            title="Go to latest messages"
                        >
                            <span className="text-sm font-medium text-primary-foreground">Latest</span>
                            <ChevronDown className="h-4 w-4 text-primary-foreground" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
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
