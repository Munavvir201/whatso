"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, Users, MessageSquare, Inbox } from "lucide-react";
import { BarChart } from "./charts";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, getCountFromServer, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

interface DashboardStats {
    totalConversations: number;
    totalMessages: number;
    activeUsers: number;
    unreadConversations: number;
    barChartData: { month: string, conversations: number }[];
}

const initialStats: DashboardStats = {
    totalConversations: 0,
    totalMessages: 0,
    activeUsers: 0,
    unreadConversations: 0,
    barChartData: [],
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const useDashboardStats = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(initialStats);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const conversationsRef = collection(db, 'userSettings', user.uid, 'conversations');

        const unsubscribe = onSnapshot(conversationsRef, async (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            
            const totalConversations = conversations.length;
            const activeUsers = totalConversations; // Assuming each conversation is a unique user

            const unreadConversations = conversations.filter(c => c.unreadCount > 0).length;

            const messageCounts = await Promise.all(
                conversations.map(async (conv) => {
                    const messagesColRef = collection(db, 'userSettings', user.uid, 'conversations', conv.id, 'messages');
                    const messageSnapshot = await getCountFromServer(messagesColRef);
                    return messageSnapshot.data().count;
                })
            );
            const totalMessages = messageCounts.reduce((acc, count) => acc + count, 0);

            // Calculate bar chart data
            const monthlyCounts: { [key: number]: number } = {};
            conversations.forEach(conv => {
                if (conv.lastUpdated) {
                    const month = conv.lastUpdated.toDate().getMonth();
                    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
                }
            });

            const barChartData = monthNames.map((name, index) => ({
                month: name,
                conversations: monthlyCounts[index] || 0,
            }));
            

            setStats({
                totalConversations,
                totalMessages,
                activeUsers,
                unreadConversations,
                barChartData
            });
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching dashboard stats: ", error);
            setStats(initialStats);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { stats, isLoading };
};

export default function DashboardPage() {
    const { stats, isLoading } = useDashboardStats();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
                </div>
                <div className="grid gap-6">
                    <Skeleton className="h-[420px]" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Total number of chats started.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            Number of unique customer chats.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                           Incoming and outgoing messages.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unread Conversations</CardTitle>
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.unreadConversations}</div>
                        <p className="text-xs text-muted-foreground">
                            Conversations awaiting a reply.
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Conversations This Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarChart />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
