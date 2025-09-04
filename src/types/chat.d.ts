
import type { Timestamp } from 'firebase/firestore';

export interface Chat {
  id: string; // This will be the customer's phone number
  name: string;
  avatar: string;
  message: string; // Last message content
  time: string; // Last message time
  unread: number;
  active: boolean;
  ai_hint: string;
}

export interface Message {
  id: string;
  sender: 'customer' | 'agent'; // Changed from 'user' | 'ai'
  content: string;
  timestamp: Timestamp | Date; // Allow both for sending and receiving
}
