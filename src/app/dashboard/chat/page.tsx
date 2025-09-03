import { ChatList } from '@/components/chat-list';
import { ChatView } from '@/components/chat-view';
import { Card } from '@/components/ui/card';

export default function ChatPage() {
  return (
    <div className="h-full">
      <Card className="h-full w-full grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] overflow-hidden">
        <ChatList />
        <ChatView />
      </Card>
    </div>
  );
}
