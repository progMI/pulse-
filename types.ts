
export enum Sentiment {
  JOY = 'JOY',
  MELANCHOLY = 'MELANCHOLY',
  ANGER = 'ANGER',
  CALM = 'CALM',
  MYSTERY = 'MYSTERY',
  EXCITEMENT = 'EXCITEMENT'
}

export type AestheticStyle = 'adaptive' | 'vibrant' | 'minimalist' | 'monochrome' | 'cybernetic';

export interface VisualConfig {
  aesthetic: AestheticStyle;
  nodeScale: number;
  flowSpeed: number;
}

export interface User {
  username: string;
  joinedAt: number;
  initialAesthetic: AestheticStyle;
}

export interface Participant {
  id: string;
  name: string;
  status: 'online' | 'idle' | 'pulsing';
  color: string;
  isAi?: boolean;
}

export interface PulseVibe {
  hue: string;
  shape: 'circle' | 'blob' | 'star' | 'diamond';
  size: number;
  frequency: number; 
  emoji: string;
  sentiment: Sentiment;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  senderId?: string;
  timestamp: number;
  vibe: PulseVibe;
  position: { x: number; y: number };
  reactions?: Record<string, number>;
  isClosed?: boolean;
  isDeleted?: boolean;
}
