import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, Clock, Smile, Users } from "lucide-react";
import { AreaChart, BarChart } from "./charts";
import { Skeleton } from "@/components/ui/skeleton";

// This is now a placeholder. In a real app, you'd fetch this from Firestore.
const dashboardStats = {
  totalConversations: {
    value: 1234,
    change: 15.2,
  },
  activeUsers: {
    value: 231,
    change: 21,
  },
  avgResponseTime: {
    value: '3.2s',
    change: -5,
  },
  satisfactionScore: {
    value: '92%',
    change: 2.1,
  },
};


export default function DashboardPage() {
  // In a real app, you would have a loading state from your data fetching hook.
  const isLoading = false; 

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
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
            <div className="text-2xl font-bold">{dashboardStats.totalConversations.value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.totalConversations.change > 0 ? '+' : ''}
              {dashboardStats.totalConversations.change}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.activeUsers.value}</div>
            <p className="text-xs text-muted-foreground">
             {dashboardStats.activeUsers.change > 0 ? '+' : ''}
             {dashboardStats.activeUsers.change}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.avgResponseTime.value}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.avgResponseTime.change}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.satisfactionScore.value}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.satisfactionScore.change > 0 ? '+' : ''}
              {dashboardStats.satisfactionScore.change}% from last month
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
