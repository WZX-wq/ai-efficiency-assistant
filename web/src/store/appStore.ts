import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 应用全局状态 */
interface AppState {
  // 主题
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // 侧边栏
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // AI写作助手面板
  aiPanelOpen: boolean;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;

  // 命令面板
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // 字数统计
  totalWordsGenerated: number;
  addWordsGenerated: (count: number) => void;

  // 使用次数
  totalActions: number;
  incrementActions: () => void;

  // 最近使用的工具
  recentTools: string[];
  addRecentTool: (toolId: string) => void;

  // 用户偏好
  preferredLanguage: 'zh' | 'en';
  setPreferredLanguage: (lang: 'zh' | 'en') => void;

  autoSave: boolean;
  setAutoSave: (autoSave: boolean) => void;

  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 主题
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // 侧边栏
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // AI面板
      aiPanelOpen: false,
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

      // 命令面板
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // 字数统计
      totalWordsGenerated: 0,
      addWordsGenerated: (count) =>
        set((s) => ({ totalWordsGenerated: s.totalWordsGenerated + count })),

      // 使用次数
      totalActions: 0,
      incrementActions: () =>
        set((s) => ({ totalActions: s.totalActions + 1 })),

      // 最近工具
      recentTools: [],
      addRecentTool: (toolId) =>
        set((s) => {
          const filtered = s.recentTools.filter((id) => id !== toolId);
          return { recentTools: [toolId, ...filtered].slice(0, 10) };
        }),

      // 偏好
      preferredLanguage: 'zh',
      setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),

      autoSave: true,
      setAutoSave: (autoSave) => set({ autoSave }),

      fontSize: 'medium',
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: 'ai-assistant-app-store',
      partialize: (state) => ({
        theme: state.theme,
        totalWordsGenerated: state.totalWordsGenerated,
        totalActions: state.totalActions,
        recentTools: state.recentTools,
        preferredLanguage: state.preferredLanguage,
        autoSave: state.autoSave,
        fontSize: state.fontSize,
      }),
    }
  )
);
