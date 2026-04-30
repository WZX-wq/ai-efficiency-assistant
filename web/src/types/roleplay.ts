export interface CharacterCard {
  id: string;
  name: string;
  description: string;
  avatar: string; // emoji
  category: 'fantasy' | 'historical' | 'survival' | 'mystery' | 'scifi' | 'romance' | 'adventure' | 'daily';
  tags: string[];
  author: string;
  playCount: number;
  rating: number; // 1-5
  createdAt: string;

  // 核心内容
  worldSetting: string; // 世界观设定（作为 systemPrompt 的一部分）
  characterPrompt: string; // 角色提示词（作为 systemPrompt 的一部分）
  greeting: string; // 开场白（AI 的第一条消息）

  // 游戏机制
  quickCommands?: QuickCommand[]; // 快捷指令
  statusFields?: StatusField[]; // 状态栏字段
}

export interface QuickCommand {
  label: string;
  prompt: string; // 发送给 AI 的指令
  icon?: string; // emoji
}

export interface StatusField {
  name: string;
  icon: string;
  defaultValue: string;
}

export interface PlaySession {
  id: string;
  cardId: string;
  cardName: string;
  messages: { role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }[];
  statusValues: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  savedAt?: number; // 存档时间
}

// Branch choice for interactive storytelling
export interface BranchChoice {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

// Achievement system
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'exploration' | 'social' | 'creation' | 'milestone';
  condition: {
    type: 'message_count' | 'session_count' | 'card_played' | 'favorite_added' | 'custom_card_created';
    target: number;
    cardId?: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: number;
}
