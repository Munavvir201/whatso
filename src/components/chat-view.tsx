import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const messages = [
  { id: 1, sender: 'user', content: 'Hey, I have a question about my order #12345.', timestamp: '10:30 AM' },
  { id: 2, sender: 'ai', content: 'Hello! I can help with that. What is your question regarding order #12345?', timestamp: '10:31 AM' },
  { id: 3, sender: 'user', content: 'I need to know the estimated delivery date.', timestamp: '10:32 AM' },
  { id: 4, sender: 'ai', content: 'Of course. Let me check... The estimated delivery date for your order is this Friday, between 9 AM and 5 PM.', timestamp: '10:32 AM' },
  { id: 5, sender: 'user', content: 'Great, thanks for the quick response!', timestamp: '10:33 AM' },
];

export function ChatView() {
  return (
    <div className="flex flex-col h-full bg-background">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src="https://picsum.photos/seed/p1/40/40" alt="John Doe" data-ai-hint="man portrait"/>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">John Doe</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Online
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="ai-mode" defaultChecked />
          <Label htmlFor="ai-mode" className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Mode</span>
          </Label>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-20rem)] p-6">
            <div className="space-y-6">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-4 py-3 text-sm",
                            message.sender === 'user' ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                        )}
                    >
                        {message.content}
                        <span className={cn("text-xs self-end", message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            {message.timestamp}
                        </span>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form className="flex w-full items-center space-x-2">
          <Textarea
            placeholder="Type your message here..."
            className="flex-1 min-h-[40px] max-h-32 resize-none"
          />
          <Button type="submit" size="icon" className="flex-shrink-0 bg-accent hover:bg-accent/90">
            <Send className="h-4 w-4 text-accent-foreground" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </div>
  )
}
