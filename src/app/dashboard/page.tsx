"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, Clock, Smile, Users } from "lucide-react";
import { AreaChart, BarChart } from "./charts";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const useDashboardStats = () => {
    const [stats, setStats] = useState({
        totalConversations: { value: 0, change: 0 },
        activeUsers: { value: 0, change: 0 },
        avgResponseTime: { value: '0s', change: 0 },
        satisfactionScore: { value: '0%', change: 0 },
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // In a real app, you might fetch this from a 'dashboard' document
                // For now, we'll simulate the fetch.
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
                
                setStats({
                    totalConversations: { value: 1234, change: 15.2 },
                    activeUsers: { value: 231, change: 21 },
                    avgResponseTime: { value: '3.2s', change: -5 },
                    satisfactionScore: { value: '92%', change: 2.1 },
                });
            } catch (error) {
                console.error("Error fetching dashboard stats: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

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
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-[420px]" />
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
                        <div className="text-2xl font-bold">{stats.totalConversations.value.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalConversations.change > 0 ? '+' : ''}
                            {stats.totalConversations.change}% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeUsers.value}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.activeUsers.change > 0 ? '+' : ''}
                            {stats.activeUsers.change}% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgResponseTime.value}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.avgResponseTime.change}% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
                        <Smile className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.satisfactionScore.value}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.satisfactionScore.change > 0 ? '+' : ''}
                            {stats.satisfactionScore.change}% from last month
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Conversations This Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BarChart />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Customer Satisfaction (CSAT)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AreaChart />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
