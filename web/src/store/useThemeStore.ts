import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeConfig {
  name: string;
  label: string;
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  fontSize: 'sm' | 'md' | 'lg';
  fontFamily: 'default' | 'serif' | 'mono';
  sidebarStyle: 'default' | 'compact' | 'expanded';
}

export const PRESET_THEMES: ThemeConfig[] = [
  { name: 'ocean', label: '海洋蓝', mode: 'light', primaryColor: 'blue', accentColor: 'cyan', borderRadius: 'lg', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'default' },
  { name: 'forest', label: '森林绿', mode: 'light', primaryColor: 'emerald', accentColor: 'teal', borderRadius: 'lg', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'default' },
  { name: 'sunset', label: '日落橙', mode: 'light', primaryColor: 'orange', accentColor: 'amber', borderRadius: 'lg', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'default' },
  { name: 'lavender', label: '薰衣草', mode: 'light', primaryColor: 'violet', accentColor: 'purple', borderRadius: 'lg', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'default' },
  { name: 'rose', label: '玫瑰红', mode: 'light', primaryColor: 'rose', accentColor: 'pink', borderRadius: 'lg', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'default' },
  { name: 'midnight', label: '午夜黑', mode: 'dark', primaryColor: 'indigo', accentColor: 'blue', borderRadius: 'lg', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'default' },
  { name: 'nord', label: '北欧风', mode: 'light', primaryColor: 'slate', accentColor: 'gray', borderRadius: 'none', fontSize: 'md', fontFamily: 'default', sidebarStyle: 'compact' },
  { name: 'warm', label: '暖阳', mode: 'light', primaryColor: 'yellow', accentColor: 'orange', borderRadius: 'xl', fontSize: 'lg', fontFamily: 'serif', sidebarStyle: 'expanded' },
];

const DEFAULT_THEME: ThemeConfig = PRESET_THEMES[0];

interface ThemeStore {
  currentTheme: ThemeConfig;
  customThemes: ThemeConfig[];
  isDark: boolean;

  setTheme: (theme: ThemeConfig) => void;
  toggleDark: () => void;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setBorderRadius: (radius: ThemeConfig['borderRadius']) => void;
  setFontSize: (size: ThemeConfig['fontSize']) => void;
  setFontFamily: (family: ThemeConfig['fontFamily']) => void;
  saveCustomTheme: (theme: ThemeConfig) => void;
  deleteCustomTheme: (name: string) => void;
  resetToDefault: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentTheme: { ...DEFAULT_THEME },
      customThemes: [],
      isDark: false,

      setTheme: (theme) => {
        const isDark = theme.mode === 'dark';
        set({ currentTheme: { ...theme }, isDark });
      },

      toggleDark: () => {
        const { currentTheme } = get();
        const newIsDark = !get().isDark;
        set({
          isDark: newIsDark,
          currentTheme: { ...currentTheme, mode: newIsDark ? 'dark' : 'light' },
        });
      },

      setPrimaryColor: (color) =>
        set((s) => ({ currentTheme: { ...s.currentTheme, primaryColor: color } })),

      setAccentColor: (color) =>
        set((s) => ({ currentTheme: { ...s.currentTheme, accentColor: color } })),

      setBorderRadius: (radius) =>
        set((s) => ({ currentTheme: { ...s.currentTheme, borderRadius: radius } })),

      setFontSize: (size) =>
        set((s) => ({ currentTheme: { ...s.currentTheme, fontSize: size } })),

      setFontFamily: (family) =>
        set((s) => ({ currentTheme: { ...s.currentTheme, fontFamily: family } })),

      saveCustomTheme: (theme) =>
        set((s) => ({
          customThemes: [
            ...s.customThemes.filter((t) => t.name !== theme.name),
            { ...theme },
          ],
        })),

      deleteCustomTheme: (name) =>
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.name !== name),
        })),

      resetToDefault: () => set({
        currentTheme: { ...DEFAULT_THEME },
        isDark: false,
      }),
    }),
    {
      name: 'ai-assistant-theme-store',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        customThemes: state.customThemes,
        isDark: state.isDark,
      }),
    }
  )
);
