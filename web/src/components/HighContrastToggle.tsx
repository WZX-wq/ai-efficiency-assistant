import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';

const STORAGE_KEY = 'a11y-high-contrast';

function isHighContrastEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

interface HighContrastToggleProps {
  className?: string;
  compact?: boolean;
}

export default function HighContrastToggle({ className = '', compact = false }: HighContrastToggleProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(isHighContrastEnabled);

  useEffect(() => {
    if (enabled) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // localStorage unavailable
    }
  }, [enabled]);

  const toggle = () => setEnabled((prev) => !prev);

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={`p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
        aria-label={t('a11y.highContrast')}
        aria-pressed={enabled}
        title={t('a11y.highContrast')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {t('a11y.highContrast')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('a11y.highContrastDesc')}
        </p>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        aria-label={t('a11y.highContrast')}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
          enabled
            ? 'bg-primary-600'
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
