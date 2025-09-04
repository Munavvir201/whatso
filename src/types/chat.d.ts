
import type { Timestamp } from 'firebase/firestore';

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: number;
  active: boolean;
  ai_hint: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Timestamp;
}
