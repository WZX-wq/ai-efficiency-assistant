import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CharacterCard, RolePlaySession } from '../data/characterCards';

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
}

export const roleplayStore = create<RolePlayState>()(
  persist(
    (set, get) => ({
      favorites: [],
      customCards: [],
      sessions: [],
      activeSessionId: null,

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
      }),
    }
  )
);
