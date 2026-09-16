export type UserRole = 'Super Admin' | 'Mega' | 'Normal' | 'User' | 'Mail Officer';

export type UserStatus = 'Active' | 'Locked';

export interface User {
  User_ID: string;
  Password: string;
  Name: string;
  Role: UserRole;
  Division: string;
  Status: UserStatus;
}

export type LetterAction = 
  | 'நடவடிக்கை எடுக்கப்பட்டது'
  | 'நடவடிக்கை எடுக்கப்படவில்லை'
  | 'கள ஆய்வில்'
  | 'இன்னும் பார்க்கவில்லை';

export interface LetterChatMessage {
  id: string;
  letterId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string; // ISO or formatted
}

export interface Letter {
  id: string;
  originalNo: string; // Auto-generated computer number based on date
  date: string; // YYYY-MM-DD (editable)
  inwardNo: string;
  fromWhom: string;
  image?: string; // base64 / data URL (~124 KB)
  imageSizeKb?: number;
  subject: string;
  forwardedTo: string[]; // list of User_IDs
  action: LetterAction;
  replyResponse: string;
  handledByMega?: boolean;
  megaHandledNote?: string;
  registeredBy: string;
  registeredByName: string;
  createdAt: string;
  chats: LetterChatMessage[];
  lastReadTimestamps?: Record<string, string>; // userId -> timestamp
}
