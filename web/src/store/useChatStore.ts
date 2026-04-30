import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// 类型定义
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
    toolUsed?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  pinned?: boolean;
}

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isStreaming: boolean;

  // Session management
  createSession: (title?: string) => string;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  switchSession: (id: string) => void;
  pinSession: (id: string) => void;

  // Message management
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string, metadata?: ChatMessage['metadata']) => void;
  clearMessages: () => void;

  // State
  setStreaming: (streaming: boolean) => void;

  // Getters
  getCurrentSession: () => ChatSession | undefined;
  getCurrentMessages: () => ChatMessage[];
  getSortedSessions: () => ChatSession[];

  // Persistence
  searchSessions: (query: string) => ChatSession[];
}

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isToday(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isYesterday(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

// ============================================================
// Store
// ============================================================

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isStreaming: false,

      // ---- Session management ----

      createSession: (title?: string) => {
        const id = generateId();
        const session: ChatSession = {
          id,
          title: title || `新对话 ${get().sessions.length + 1}`,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [],
          pinned: false,
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          currentSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) =>
        set((s) => {
          const sessions = s.sessions.filter((sess) => sess.id !== id);
          const currentSessionId =
            s.currentSessionId === id
              ? sessions[0]?.id || null
              : s.currentSessionId;
          return { sessions, currentSessionId };
        }),

      renameSession: (id, title) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, title, updatedAt: Date.now() } : sess
          ),
        })),

      switchSession: (id) => set({ currentSessionId: id }),

      pinSession: (id) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id
              ? { ...sess, pinned: !sess.pinned, updatedAt: Date.now() }
              : sess
          ),
        })),

      // ---- Message management ----

      addMessage: (message) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;

        const fullMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        };

        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== currentSessionId) return sess;
            const updatedMessages = [...sess.messages, fullMessage];
            // Auto-generate title from first user message
            const autoTitle =
              sess.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
                : sess.title;
            return {
              ...sess,
              messages: updatedMessages,
              title: autoTitle,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateLastMessage: (content, metadata) => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;

        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== currentSessionId || sess.messages.length === 0)
              return sess;
            const messages = [...sess.messages];
            const lastIdx = messages.length - 1;
            if (messages[lastIdx].role === 'assistant') {
              messages[lastIdx] = {
                ...messages[lastIdx],
                content,
                metadata: metadata
                  ? { ...messages[lastIdx].metadata, ...metadata }
                  : messages[lastIdx].metadata,
              };
            }
            return { ...sess, messages, updatedAt: Date.now() };
          }),
        }));
      },

      clearMessages: () => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;

        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === currentSessionId
              ? { ...sess, messages: [], updatedAt: Date.now() }
              : sess
          ),
        }));
      },

      // ---- State ----

      setStreaming: (streaming) => set({ isStreaming: streaming }),

      // ---- Getters ----

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId);
      },

      getCurrentMessages: () => {
        const session = get().getCurrentSession();
        return session?.messages || [];
      },

      getSortedSessions: () => {
        const { sessions } = get();
        const pinned = sessions.filter((s) => s.pinned);
        const unpinned = sessions.filter((s) => !s.pinned);
        // Sort pinned by updatedAt desc, unpinned by updatedAt desc
        const sortFn = (a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt;
        return [...pinned.sort(sortFn), ...unpinned.sort(sortFn)];
      },

      // ---- Persistence ----

      searchSessions: (query: string) => {
        const { sessions } = get();
        const lowerQuery = query.toLowerCase();
        return sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(lowerQuery) ||
            s.messages.some((m) => m.content.toLowerCase().includes(lowerQuery)) ||
            s.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      },
    }),
    {
      name: 'ai-enhanced-chat-store',
      partialize: (state) => ({
        sessions: state.sessions.slice(-50).map((s) => ({
          ...s,
          messages: s.messages.slice(-100),
        })),
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);

// ============================================================
// 日期分组辅助
// ============================================================

export type SessionGroup = 'pinned' | 'today' | 'yesterday' | 'earlier';

export function groupSessionsByDate(
  sessions: ChatSession[]
): Record<SessionGroup, ChatSession[]> {
  const groups: Record<SessionGroup, ChatSession[]> = {
    pinned: [],
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const session of sessions) {
    if (session.pinned) {
      groups.pinned.push(session);
    } else if (isToday(session.updatedAt)) {
      groups.today.push(session);
    } else if (isYesterday(session.updatedAt)) {
      groups.yesterday.push(session);
    } else {
      groups.earlier.push(session);
    }
  }

  return groups;
}
