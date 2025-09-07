
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrainingContext } from './training-context';
import { generateSimpleAIResponse } from '@/ai/simple-ai';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface TestMessage {
  sender: 'user' | 'ai';
  text: string;
}

export function TestChat() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { clientData, trainingInstructions, chatFlow } = useTrainingContext();
  const { user } = useAuth();

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: TestMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
        // Get user's AI settings
        if (!user) {
            throw new Error('You must be logged in to test the AI');
        }
        
        const userSettingsRef = doc(db, "userSettings", user.uid);
        const userSettingsDoc = await getDoc(userSettingsRef);
        
        if (!userSettingsDoc.exists() || !userSettingsDoc.data()?.ai) {
            throw new Error('Please configure your AI settings first');
        }
        
        const aiSettings = userSettingsDoc.data().ai;
        if (aiSettings.status !== 'verified') {
            throw new Error('Please verify your AI settings first');
        }
        
        const conversationHistory = messages
          .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
          .join('\n');
          
        const trainingData = `
          TRAINING DATA:
          ${clientData}
          
          INSTRUCTIONS:
          ${trainingInstructions}
          
          CHAT FLOW:
          ${chatFlow}
        `;

        const aiResult = await generateSimpleAIResponse({
            message: input,
            conversationHistory,
            clientData: trainingData,
            userApiKey: aiSettings.apiKey,
            userModel: aiSettings.model,
        });

        const aiMessage: TestMessage = { sender: 'ai', text: aiResult.response };
        setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
        console.error("Error fetching AI response:", error);
        const errorMessage: TestMessage = { sender: 'ai', text: "Sorry, I encountered an error." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <ScrollArea className="flex-1" viewportRef={viewportRef}>
        <div className="p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={cn("flex items-start gap-3", msg.sender === 'user' ? "justify-end" : "")}>
               {msg.sender === 'ai' && (
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
               )}
               <div className={cn("p-3 rounded-lg max-w-[80%]", msg.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{msg.text}</p>
               </div>
                {msg.sender === 'user' && (
                   <div className="p-2 bg-muted rounded-full">
                     <User className="h-5 w-5 text-muted-foreground" />
                   </div>
                )}
            </div>
          ))}
           {isLoading && (
              <div className="flex items-start gap-3">
                 <div className="p-2 bg-primary/10 rounded-full">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                   <div className="p-3 rounded-lg bg-muted flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                   </div>
              </div>
            )}
        </div>
      </ScrollArea>
      <div className="p-2 border-t bg-background">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[40px] max-h-24 resize-none"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
