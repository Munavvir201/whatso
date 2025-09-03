"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, collection, writeBatch } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";

// Dummy data to be seeded
const dashboardStatsData = {
    totalConversations: { value: 1234, change: 15.2 },
    activeUsers: { value: 231, change: 21 },
    avgResponseTime: { value: '3.2s', change: -5 },
    satisfactionScore: { value: '92%', change: 2.1 },
    barChartData: [
      { month: "January", conversations: 186 },
      { month: "February", conversations: 305 },
      { month: "March", conversations: 237 },
      { month: "April", conversations: 273 },
      { month: "May", conversations: 209 },
      { month: "June", conversations: 214 },
    ],
    areaChartData: [
      { date: "2024-01-01", score: 88 },
      { date: "2024-02-01", score: 89 },
      { date: "2024-03-01", score: 91 },
      { date: "2024-04-01", score: 90 },
      { date: "2024-05-01", score: 92 },
      { date: "2024-06-01", score: 93 },
    ]
};

const chatsData = [
    { id: '1', name: 'John Doe', avatar: 'https://picsum.photos/seed/p1/40/40', message: 'Hey, I have a question about my order.', time: '10:30 AM', unread: 2, active: true, ai_hint: 'man portrait' },
    { id: '2', name: 'Alice Smith', avatar: 'https://picsum.photos/seed/p2/40/40', message: 'Perfect, thank you!', time: '10:25 AM', unread: 0, active: false, ai_hint: 'woman face' },
    { id: '3', name: 'Bob Johnson', avatar: 'https://picsum.photos/seed/p3/40/40', message: 'Can you help me with a return?', time: '9:15 AM', unread: 0, active: false, ai_hint: 'person glasses' },
    { id: '4', name: 'Emily White', avatar: 'https://picsum.photos/seed/p4/40/40', message: 'I need to update my shipping address.', time: 'Yesterday', unread: 5, active: false, ai_hint: 'woman smiling' },
    { id: '5', name: 'Michael Brown', avatar: 'https://picsum.photos/seed/p5/40/40', message: 'What are your business hours?', time: 'Yesterday', unread: 0, active: false, ai_hint: 'man smiling' },
];

const messagesData: { [key: string]: any[] } = {
    '1': [
        { sender: 'user', content: 'Hey, I have a question about my order #12345.', timestamp: new Date('2024-07-20T10:30:00') },
        { sender: 'ai', content: 'Hello! I can help with that. What is your question regarding order #12345?', timestamp: new Date('2024-07-20T10:31:00') },
        { sender: 'user', content: 'I need to know the estimated delivery date.', timestamp: new Date('2024-07-20T10:32:00') },
        { sender: 'ai', content: 'Of course. Let me check... The estimated delivery date for your order is this Friday, between 9 AM and 5 PM.', timestamp: new Date('2024-07-20T10:32:30') },
        { sender: 'user', content: 'Great, thanks for the quick response!', timestamp: new Date('2024-07-20T10:33:00') },
    ]
};


export default function SeedDatabasePage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSeed = async () => {
        setIsLoading(true);
        toast({ title: "Seeding Database...", description: "Please wait while we add the sample data." });
        
        try {
            const batch = writeBatch(db);

            // 1. Seed dashboard_stats
            const statsDocRef = doc(db, "dashboard", "stats");
            batch.set(statsDocRef, dashboardStatsData);

            // 2. Seed chats and messages
            for (const chat of chatsData) {
                const chatDocRef = doc(db, "chats", chat.id);
                batch.set(chatDocRef, chat);

                if (messagesData[chat.id]) {
                    for (const message of messagesData[chat.id]) {
                        const messageDocRef = doc(collection(db, "chats", chat.id, "messages"));
                        batch.set(messageDocRef, message);
                    }
                }
            }

            await batch.commit();

            toast({
                title: "Database Seeded Successfully!",
                description: "Your dashboard and chat are now populated with sample data.",
            });
        } catch (error: any) {
            console.error("Error seeding database: ", error);
            toast({
                variant: "destructive",
                title: "Error Seeding Database",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="font-headline">Seed Your Database</CardTitle>
                    <CardDescription>
                        Click the button below to populate your Firestore database with sample data. This will allow you to see the dashboard and chat functionalities in action.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSeed} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Seeding...
                            </>
                        ) : (
                            "Seed Database Now"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}