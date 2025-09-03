"use client"

import { AreaChart as RechartsAreaChart, BarChart as RechartsBarChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const barChartData = [
  { month: "January", conversations: 186 },
  { month: "February", conversations: 305 },
  { month: "March", conversations: 237 },
  { month: "April", conversations: 273 },
  { month: "May", conversations: 209 },
  { month: "June", conversations: 214 },
]

const areaChartData = [
  { date: "2024-01-01", score: 88 },
  { date: "2024-02-01", score: 89 },
  { date: "2024-03-01", score: 91 },
  { date: "2024-04-01", score: 90 },
  { date: "2024-05-01", score: 92 },
  { date: "2024-06-01", score: 93 },
]

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
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={barChartData}>
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
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <RechartsAreaChart data={areaChartData}>
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
