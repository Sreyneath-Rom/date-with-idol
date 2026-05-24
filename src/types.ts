// types.ts

/* =========================
   IDOL TYPE
========================= */

export interface Idol {
  id: string;

  name: string;

  role: string;

  personality: string;

  personalityTag: string;

  image: string;

  voiceIntro: string;

  hobbies: string[];

  favoriteFood: string;

  difficulty: number;

  instagram?: string;
}

/* =========================
   APP VIEW TYPE
========================= */

export type AppView =
  | 'intro'
  | 'selection'
  | 'hub'
  | 'chat'
  | 'memories';

/* =========================
   CHAT MESSAGE
========================= */

export interface ChatMessage {
  id: string;

  sender: 'idol' | 'player';

  senderId?: string;

  senderName?: string;

  text: string;

  timestamp: number;

  type: 'text' | 'voice' | 'image';

  imageUrl?: string;

  audioUrl?: string;

  audioDuration?: number;

  reaction?: string;

  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };

  translatedText?: string;
}

/* =========================
   GROUP CHAT
========================= */

export interface GroupChat {
  id: string;

  name: string;

  role: string;

  personality: string;

  personalityTag: string;

  image: string;

  members: string[];

  voiceIntro: string;

  difficulty: number;
}

/* =========================
   USER PROFILE
========================= */

export interface UserProfile {
  name: string;

  selectedIdolId: string | null;

  affection: number;
}

/* =========================
   FIREBASE USER DATA
========================= */

export interface FirebaseUserData {
  uid: string;

  email: string | null;

  displayName: string | null;

  photoURL: string | null;

  createdAt?: number;
}

/* =========================
   CHAT ROOM
========================= */

export interface ChatRoom {
  id: string;

  type: 'idol' | 'group';

  title: string;

  image: string;

  lastMessage?: string;

  updatedAt?: number;
}

/* =========================
   MEMORY ITEM
========================= */

export interface MemoryItem {
  id: string;

  image: string;

  title: string;

  description: string;

  createdAt: number;
}

/* =========================
   API RESPONSE
========================= */

export interface ChatApiResponse {
  text?: string;

  responses?: {
    senderId: string;
    senderName: string;
    text: string;
  }[];

  error?: string;
}

/* =========================
   TTS RESPONSE
========================= */

export interface TTSResponse {
  audio?: string;

  mimeType?: string;

  fallback?: boolean;

  error?: string;
}

/* =========================
   TRANSLATE RESPONSE
========================= */

export interface TranslateResponse {
  translatedText: string;
}

/* =========================
   BATCH TRANSLATE RESPONSE
========================= */

export interface BatchTranslateResponse {
  translations: {
    id: string;
    translatedText: string;
  }[];
}
