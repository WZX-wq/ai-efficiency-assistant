import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// 类型定义
// ============================================================

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: number;
  plan: 'free' | 'pro' | 'enterprise';
  wordsGenerated: number;
  aiCalls: number;
  toolsUsed: string[];
  achievements: string[];
}

interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: number;
}

interface UserState {
  user: User | null;
  isDemoMode: boolean;
  isAuthenticated: boolean;
  activities: ActivityItem[];

  login: (email: string, password: string) => boolean;
  register: (username: string, email: string, password: string) => boolean;
  logout: () => void;
  enterDemoMode: () => void;
  updateProfile: (updates: Partial<User>) => void;
  addWordsGenerated: (count: number) => void;
  incrementAiCalls: () => void;
  addToolUsed: (toolId: string) => void;
  addActivity: (action: string, detail: string) => void;
  clearActivities: () => void;
}

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function createDefaultAvatar(username: string): string {
  const colors = ['3B82F6', '8B5CF6', 'EC4899', 'F59E0B', '10B981', '6366F1'];
  const colorIndex = username.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];
  const initial = username.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="%23${color}"/><text x="40" y="52" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 6;
}

// ============================================================
// Store
// ============================================================

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isDemoMode: false,
      isAuthenticated: false,
      activities: [],

      login: (email: string, password: string): boolean => {
        if (!validateEmail(email)) return false;
        if (!validatePassword(password)) return false;

        // 检查是否有已注册用户 (简单 localStorage 验证)
        const usersKey = 'ai-assistant-registered-users';
        const stored = localStorage.getItem(usersKey);
        let users: Array<{ username: string; email: string; password: string }> = [];
        if (stored) {
          try {
            users = JSON.parse(stored);
          } catch {
            users = [];
          }
        }

        const found = users.find((u) => u.email === email && u.password === password);
        if (!found) return false;

        const user: User = {
          id: generateId(),
          username: found.username,
          email: found.email,
          avatar: createDefaultAvatar(found.username),
          createdAt: Date.now(),
          plan: 'free',
          wordsGenerated: 0,
          aiCalls: 0,
          toolsUsed: [],
          achievements: [],
        };

        set({
          user,
          isAuthenticated: true,
          isDemoMode: false,
          activities: [],
        });

        return true;
      },

      register: (username: string, email: string, password: string): boolean => {
        if (!username.trim() || username.trim().length < 2) return false;
        if (!validateEmail(email)) return false;
        if (!validatePassword(password)) return false;

        // 存储注册用户到 localStorage
        const usersKey = 'ai-assistant-registered-users';
        const stored = localStorage.getItem(usersKey);
        let users: Array<{ username: string; email: string; password: string }> = [];
        if (stored) {
          try {
            users = JSON.parse(stored);
          } catch {
            users = [];
          }
        }

        // 检查邮箱是否已注册
        if (users.some((u) => u.email === email)) return false;

        users.push({ username: username.trim(), email, password });
        localStorage.setItem(usersKey, JSON.stringify(users));

        const user: User = {
          id: generateId(),
          username: username.trim(),
          email,
          avatar: createDefaultAvatar(username.trim()),
          createdAt: Date.now(),
          plan: 'free',
          wordsGenerated: 0,
          aiCalls: 0,
          toolsUsed: [],
          achievements: [],
        };

        set({
          user,
          isAuthenticated: true,
          isDemoMode: false,
          activities: [],
        });

        return true;
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isDemoMode: false,
          activities: [],
        });
      },

      enterDemoMode: () => {
        const user: User = {
          id: 'demo-' + generateId(),
          username: '体验用户',
          email: 'demo@example.com',
          avatar: createDefaultAvatar('体验用户'),
          createdAt: Date.now(),
          plan: 'free',
          wordsGenerated: 0,
          aiCalls: 0,
          toolsUsed: [],
          achievements: [],
        };

        set({
          user,
          isAuthenticated: true,
          isDemoMode: true,
          activities: [],
        });
      },

      updateProfile: (updates: Partial<User>) => {
        const current = get().user;
        if (!current) return;

        if (updates.username && updates.username.trim().length < 2) return;

        const updated = { ...current, ...updates };
        if (updates.username) {
          updated.avatar = createDefaultAvatar(updates.username);
        }

        set({ user: updated });
      },

      addWordsGenerated: (count: number) => {
        const current = get().user;
        if (!current) return;
        set({
          user: {
            ...current,
            wordsGenerated: current.wordsGenerated + count,
          },
        });
      },

      incrementAiCalls: () => {
        const current = get().user;
        if (!current) return;
        set({
          user: {
            ...current,
            aiCalls: current.aiCalls + 1,
          },
        });
      },

      addToolUsed: (toolId: string) => {
        const current = get().user;
        if (!current) return;
        if (current.toolsUsed.includes(toolId)) return;
        set({
          user: {
            ...current,
            toolsUsed: [...current.toolsUsed, toolId],
          },
        });
      },

      addActivity: (action: string, detail: string) => {
        const item: ActivityItem = {
          id: generateId(),
          action,
          detail,
          timestamp: Date.now(),
        };
        set((state) => ({
          activities: [item, ...state.activities].slice(0, 50),
        }));
      },

      clearActivities: () => {
        set({ activities: [] });
      },
    }),
    {
      name: 'ai-assistant-user-store',
    }
  )
);
