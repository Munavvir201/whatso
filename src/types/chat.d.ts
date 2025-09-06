
import type { Timestamp } from 'firebase/firestore';

export interface Chat {
  id: string; // This will be the customer's phone number
  name: string;
  number: string;
  avatar: string;
  message: string; // Last message content
  time: string; // Last message time
  unreadCount: number;
  active: boolean;
  ai_hint: string;
}

export interface Message {
  id: string;
  sender: 'customer' | 'agent';
  content: string;
  timestamp: Timestamp | Date; // Allow both for sending and receiving
  whatsappMessageId?: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  mediaUrl?: string; // URL to the media file (can be a data URI)
  mimeType?: string;
  caption?: string; // For media messages
}
