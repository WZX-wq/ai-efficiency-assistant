import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CharacterCard, RolePlaySession } from '../data/characterCards';
import type { Achievement } from '../types/roleplay';

/** 默认成就列表 */
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_chat', title: '初次冒险', description: '完成第一次角色扮演对话', icon: '🌟', category: 'milestone', condition: { type: 'message_count', target: 1 }, rarity: 'common' },
  { id: 'talkative', title: '话痨玩家', description: '在单次对话中发送10条消息', icon: '💬', category: 'social', condition: { type: 'message_count', target: 10 }, rarity: 'common' },
  { id: 'storyteller', title: '故事大师', description: '在单次对话中发送30条消息', icon: '📖', category: 'social', condition: { type: 'message_count', target: 30 }, rarity: 'rare' },
  { id: 'explorer', title: '世界探索者', description: '体验3个不同的角色卡', icon: '🗺️', category: 'exploration', condition: { type: 'card_played', target: 3 }, rarity: 'rare' },
  { id: 'collector', title: '收藏家', description: '收藏5个角色卡', icon: '💎', category: 'creation', condition: { type: 'favorite_added', target: 5 }, rarity: 'rare' },
  { id: 'creator', title: '造物主', description: '创建第一个自定义角色卡', icon: '🎨', category: 'creation', condition: { type: 'custom_card_created', target: 1 }, rarity: 'common' },
  { id: 'veteran', title: '资深玩家', description: '完成10次游戏会话', icon: '🏆', category: 'milestone', condition: { type: 'session_count', target: 10 }, rarity: 'epic' },
  { id: 'legend', title: '传说玩家', description: '在单次对话中发送50条消息', icon: '👑', category: 'milestone', condition: { type: 'message_count', target: 50 }, rarity: 'legendary' },
  { id: 'world_traveler', title: '环球旅行家', description: '体验8个不同的角色卡', icon: '🌍', category: 'exploration', condition: { type: 'card_played', target: 8 }, rarity: 'epic' },
  { id: 'master_collector', title: '大师收藏家', description: '收藏10个角色卡', icon: '🏅', category: 'creation', condition: { type: 'favorite_added', target: 10 }, rarity: 'epic' },
];

/** 角色扮演全局状态 */
interface RolePlayState {
  /** 收藏的角色卡 ID 列表 */
  favorites: string[];
  /** 自定义角色卡 */
  customCards: CharacterCard[];
  /** 存档列表 */
  sessions: RolePlaySession[];
  /** 当前活跃会话 ID */
  activeSessionId: string | null;
  /** 成就列表 */
  achievements: Achievement[];

  // 收藏操作
  toggleFavorite: (cardId: string) => void;
  isFavorite: (cardId: string) => boolean;

  // 自定义角色卡操作
  addCustomCard: (card: CharacterCard) => void;
  updateCustomCard: (cardId: string, updates: Partial<CharacterCard>) => void;
  deleteCustomCard: (cardId: string) => void;

  // 会话操作
  createSession: (cardId: string, initialStatus: Record<string, string>) => string;
  saveSession: (sessionId: string, messages: RolePlaySession['messages'], statusValues: Record<string, string>) => void;
  deleteSession: (sessionId: string) => void;
  getActiveSession: () => RolePlaySession | null;
  setActiveSession: (sessionId: string | null) => void;

  // 导出/导入
  exportSession: (sessionId: string) => string | null;
  importSession: (json: string) => boolean;

  // 成就操作
  unlockAchievement: (achievementId: string) => void;
  checkAchievements: (stats: { totalMessages: number; totalSessions: number; cardsPlayed: string[]; favoritesCount: number; customCardsCount: number }) => Achievement[];
}

export const roleplayStore = create<RolePlayState>()(
  persist(
    (set, get) => ({
      favorites: [],
      customCards: [],
      sessions: [],
      activeSessionId: null,
      achievements: DEFAULT_ACHIEVEMENTS,

      // ---- 收藏 ----
      toggleFavorite: (cardId) =>
        set((s) => ({
          favorites: s.favorites.includes(cardId)
            ? s.favorites.filter((id) => id !== cardId)
            : [...s.favorites, cardId],
        })),

      isFavorite: (cardId) => get().favorites.includes(cardId),

      // ---- 自定义角色卡 ----
      addCustomCard: (card) =>
        set((s) => ({ customCards: [...s.customCards, card] })),

      updateCustomCard: (cardId, updates) =>
        set((s) => ({
          customCards: s.customCards.map((c) =>
            c.id === cardId ? { ...c, ...updates } : c,
          ),
        })),

      deleteCustomCard: (cardId) =>
        set((s) => ({
          customCards: s.customCards.filter((c) => c.id !== cardId),
        })),

      // ---- 会话 ----
      createSession: (cardId, initialStatus) => {
        const id = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const session: RolePlaySession = {
          id,
          cardId,
          messages: [],
          statusValues: initialStatus,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      saveSession: (sessionId, messages, statusValues) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, messages, statusValues, updatedAt: Date.now() }
              : sess,
          ),
        })),

      deleteSession: (sessionId) =>
        set((s) => {
          const sessions = s.sessions.filter((sess) => sess.id !== sessionId);
          const activeSessionId =
            s.activeSessionId === sessionId
              ? sessions[0]?.id || null
              : s.activeSessionId;
          return { sessions, activeSessionId };
        }),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId) || null;
      },

      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      // ---- 导出/导入 ----
      exportSession: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return null;
        try {
          return JSON.stringify(session, null, 2);
        } catch {
          return null;
        }
      },

      importSession: (json) => {
        try {
          const session = JSON.parse(json) as RolePlaySession;
          if (!session.id || !session.cardId || !Array.isArray(session.messages)) {
            return false;
          }
          // 避免重复 ID
          session.id = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          session.createdAt = Date.now();
          session.updatedAt = Date.now();
          set((s) => ({ sessions: [session, ...s.sessions] }));
          return true;
        } catch {
          return false;
        }
      },

      // ---- 成就 ----
      unlockAchievement: (achievementId) =>
        set((s) => ({
          achievements: s.achievements.map((a) =>
            a.id === achievementId && !a.unlockedAt
              ? { ...a, unlockedAt: Date.now() }
              : a,
          ),
        })),

      checkAchievements: (stats) => {
        const state = get();
        const newlyUnlocked: Achievement[] = [];

        for (const achievement of state.achievements) {
          if (achievement.unlockedAt) continue;

          let shouldUnlock = false;
          switch (achievement.condition.type) {
            case 'message_count':
              shouldUnlock = stats.totalMessages >= achievement.condition.target;
              break;
            case 'session_count':
              shouldUnlock = stats.totalSessions >= achievement.condition.target;
              break;
            case 'card_played':
              shouldUnlock = stats.cardsPlayed.length >= achievement.condition.target;
              break;
            case 'favorite_added':
              shouldUnlock = stats.favoritesCount >= achievement.condition.target;
              break;
            case 'custom_card_created':
              shouldUnlock = stats.customCardsCount >= achievement.condition.target;
              break;
          }

          if (shouldUnlock) {
            newlyUnlocked.push({ ...achievement, unlockedAt: Date.now() });
            set((s) => ({
              achievements: s.achievements.map((a) =>
                a.id === achievement.id
                  ? { ...a, unlockedAt: Date.now() }
                  : a,
              ),
            }));
          }
        }

        return newlyUnlocked;
      },
    }),
    {
      name: 'ai-assistant-roleplay-store',
      partialize: (state) => ({
        favorites: state.favorites,
        customCards: state.customCards,
        sessions: state.sessions.slice(-20).map((s) => ({
          ...s,
          messages: s.messages.slice(-100),
        })),
        activeSessionId: state.activeSessionId,
        achievements: state.achievements,
      }),
    }
  )
);
