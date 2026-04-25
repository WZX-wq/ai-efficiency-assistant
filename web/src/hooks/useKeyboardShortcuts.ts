import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function useKeyboardShortcuts(onCommandPaletteOpen: () => void) {
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      // Ctrl+K → command palette
      if (e.key === 'k') {
        e.preventDefault();
        onCommandPaletteOpen();
        return;
      }

      // Ctrl+/ → toggle shortcuts help
      if (e.key === '/') {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="搜索"]');
        search?.focus();
        return;
      }

      // Ctrl+, → settings
      if (e.key === ',') {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // Ctrl+Shift+S → settings (legacy)
      if (e.key === 'S' && !e.shiftKey) {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // Ctrl+Shift+D → toggle dark mode
      if (e.key === 'D') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
        return;
      }

      // Ctrl+H → history
      if (e.key === 'h') {
        e.preventDefault();
        navigate('/workspace/history');
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, onCommandPaletteOpen, theme, setTheme]);
}
