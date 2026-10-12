export type UserRole = 'Super Admin' | 'Mega' | 'Luxury' | 'Normal' | 'User' | 'Mail Officer';

export type UserStatus = 'Active' | 'Locked';

export type LetterAction =
  | 'Not Yet Viewed'
  | 'Action Taken'
  | 'Action Not Taken'
  | 'Under Investigation'
  // Tamil compatibility
  | 'இன்னும் பார்க்கவில்லை'
  | 'நடவடிக்கை எடுக்கப்பட்டது'
  | 'நடவடிக்கை எடுக்கப்படவில்லை'
  | 'கள ஆய்வில்';

export interface LetterChatMessage {
  id: string;
  letterId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
}

export interface Letter {
  id: string;
  originalNo: string;
  date: string; // Registered date YYYY-MM-DD
  dispatchedDate: string; // Date letter was sent/dispatched
  letterType: string; // Registered Post, Normal Letter, Express Post, Hand Delivery
  registeredPostNo: string; // Registered post registration number
  inwardNo: string;
  fromWhom: string;
  subject: string;
  division: string;
  forwardedDivisions?: string[]; // Multiple forwarded divisions
  forwardedTo: string[]; // User IDs
  action: LetterAction;
  replyResponse?: string;
  fileNo?: string; // Filed Folder / File Number (பைல் இலக்கம் / கோப்பு இலக்கம்)
  image?: string;
  imageSizeKb?: number;
  registeredBy: string;
  registeredByName: string;
  handledByMega?: boolean;
  megaHandledNote?: string;
  createdAt: string;
  chats?: LetterChatMessage[];
}

export interface User {
  User_ID: string;
  Password: string;
  Name: string;
  Role: UserRole;
  Division: string;
  Status: UserStatus;
  designation?: string;
  // Dedicated permissions for Luxury Role
  assignedDivisions?: string[];
  assignedOfficers?: string[];
}
