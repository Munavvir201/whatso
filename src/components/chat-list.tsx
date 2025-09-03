import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./ui/badge"

const chats = [
  { id: 1, name: 'John Doe', avatar: 'https://picsum.photos/seed/p1/40/40', message: 'Hey, I have a question about my order.', time: '10:30 AM', unread: 2, active: true, ai_hint: 'man portrait' },
  { id: 2, name: 'Alice Smith', avatar: 'https://picsum.photos/seed/p2/40/40', message: 'Perfect, thank you!', time: '10:25 AM', unread: 0, active: false, ai_hint: 'woman face' },
  { id: 3, name: 'Bob Johnson', avatar: 'https://picsum.photos/seed/p3/40/40', message: 'Can you help me with a return?', time: '9:15 AM', unread: 0, active: false, ai_hint: 'person glasses' },
  { id: 4, name: 'Emily White', avatar: 'https://picsum.photos/seed/p4/40/40', message: 'I need to update my shipping address.', time: 'Yesterday', unread: 5, active: false, ai_hint: 'woman smiling' },
  { id: 5, name: 'Michael Brown', avatar: 'https://picsum.photos/seed/p5/40/40', message: 'What are your business hours?', time: 'Yesterday', unread: 0, active: false, ai_hint: 'man smiling' },
  { id: 6, name: 'Sarah Green', avatar: 'https://picsum.photos/seed/p6/40/40', message: 'Is this item in stock?', time: '2 days ago', unread: 0, active: false, ai_hint: 'woman nature' },
  { id: 7, name: 'David Black', avatar: 'https://picsum.photos/seed/p7/40/40', message: 'I received a damaged product.', time: '3 days ago', unread: 0, active: false, ai_hint: 'person serious' },
];

export function ChatList() {
  return (
    <div className="border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-headline font-semibold">Conversations</h2>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-10" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={cn(
                "w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors",
                chat.active ? "bg-primary/10" : "hover:bg-muted"
              )}
            >
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={chat.avatar} alt={chat.name} data-ai-hint={chat.ai_hint} />
                <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">{chat.name}</h3>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.message}</p>
              </div>
              {chat.unread > 0 && (
                <div className="flex items-center h-full">
                    <Badge variant="default" className="bg-primary h-5 w-5 flex items-center justify-center p-0">{chat.unread}</Badge>
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
