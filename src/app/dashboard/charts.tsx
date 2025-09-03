"use client"

import { AreaChart as RechartsAreaChart, BarChart as RechartsBarChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import React from "react"
import { useDashboardStats } from "./page" // Import the hook

const chartConfig = {
  conversations: {
    label: "Conversations",
    color: "hsl(var(--primary))",
  },
  score: {
    label: "CSAT Score",
    color: "hsl(var(--accent))",
  }
}

export function BarChart() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={stats.barChartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="conversations" fill="var(--color-conversations)" radius={4} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

export function AreaChart() {
  const { stats, isLoading } = useDashboardStats();

    if (isLoading) {
      return <Skeleton className="h-[300px] w-full" />
    }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RechartsAreaChart data={stats.areaChartData}>
          <CartesianGrid vertical={false} />
          <XAxis 
            dataKey="date" 
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
           />
          <YAxis domain={[80, 100]} />
          <Tooltip content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="score" stroke="hsl(var(--accent))" fill="url(#colorScore)" strokeWidth={2} />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
