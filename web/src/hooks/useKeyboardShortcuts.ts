import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts(onCommandPaletteOpen: () => void) {
  const navigate = useNavigate();

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

      // Ctrl+Shift+S → settings
      if (e.key === 'S') {
        e.preventDefault();
        navigate('/settings');
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, onCommandPaletteOpen]);
}
