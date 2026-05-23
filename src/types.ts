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
}

export type AppView = 'intro' | 'selection' | 'hub' | 'chat' | 'date' | 'memories' | 'closet';

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

export interface GroupChat {
  id: string;
  name: string;
  role: string;
  personality: string;
  personalityTag: string;
  image: string;
  members: string[]; // member IDs included
  voiceIntro: string;
  difficulty: number;
}

export interface UserProfile {
  name: string;
  selectedIdolId: string | null;
  affection: number;
}
