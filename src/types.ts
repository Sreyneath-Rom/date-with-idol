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
  text: string;
  timestamp: number;
  type: 'text' | 'voice' | 'image';
  imageUrl?: string;
  reaction?: string;
}

export interface UserProfile {
  name: string;
  selectedIdolId: string | null;
  affection: number;
}
