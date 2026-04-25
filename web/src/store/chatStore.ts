import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatSession {
  id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: number }[];
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;

  // 会话操作
  createSession: (systemPrompt: string, title?: string) => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  clearAllSessions: () => void;

  // 消息操作
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string) => void;
  updateLastMessage: (sessionId: string, content: string) => void;
  clearMessages: (sessionId: string) => void;

  // 辅助
  getActiveSession: () => ChatSession | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (systemPrompt, title) => {
        const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const session: ChatSession = {
          id,
          title: title || `对话 ${get().sessions.length + 1}`,
          messages: [],
          systemPrompt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) =>
        set((s) => {
          const sessions = s.sessions.filter((sess) => sess.id !== id);
          const activeSessionId =
            s.activeSessionId === id
              ? sessions[0]?.id || null
              : s.activeSessionId;
          return { sessions, activeSessionId };
        }),

      setActiveSession: (id) => set({ activeSessionId: id }),

      renameSession: (id, title) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, title, updatedAt: Date.now() } : sess
          ),
        })),

      clearAllSessions: () => set({ sessions: [], activeSessionId: null }),

      addMessage: (sessionId, role, content) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: [...sess.messages, { role, content, timestamp: Date.now() }],
                  updatedAt: Date.now(),
                  // 自动生成标题（取第一条用户消息前20字）
                  title:
                    sess.messages.length === 0 && role === 'user'
                      ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
                      : sess.title,
                }
              : sess
          ),
        })),

      updateLastMessage: (sessionId, content) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId || sess.messages.length === 0) return sess;
            const messages = [...sess.messages];
            const lastIdx = messages.length - 1;
            if (messages[lastIdx].role === 'assistant') {
              messages[lastIdx] = { ...messages[lastIdx], content };
            }
            return { ...sess, messages, updatedAt: Date.now() };
          }),
        })),

      clearMessages: (sessionId) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, messages: [], updatedAt: Date.now() }
              : sess
          ),
        })),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId) || null;
      },
    }),
    {
      name: 'ai-assistant-chat-sessions',
      partialize: (state) => ({
        sessions: state.sessions.slice(-20).map(s => ({
          ...s,
          messages: s.messages.slice(-50),
        })),
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
