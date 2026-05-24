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
  trust: number;
  chemistry: number;
  comfort: number;
}

export interface StatusUpdate {
  id: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
  likes: number;
}

export interface DynamicEvent {
  id: string;
  type: 'message' | 'call' | 'selfie' | 'date';
  title: string;
  description: string;
  expiresAt: number;
}

export interface DialogueChoice {
  id: string;
  text: string;
  affection: number;
  trust: number;
  chemistry: number;
  nextNode: string;
}

export interface DialogueNode {
  id: string;
  text: string;
  choices: DialogueChoice[];
}

export interface StoryEpisode {
  id: string;
  title: string;
  description: string;
  reqAffection: number;
  unlocked: boolean;
  thumbnail: string;
}

export type AppView = 'intro' | 'selection' | 'hub' | 'chat' | 'memories' | 'date' | 'events' | 'story_episodes';
