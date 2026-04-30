import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { useSeo } from '../components/SeoHead';
import HighContrastToggle from '../components/HighContrastToggle';
import { prefersReducedMotion, announceToScreenReader } from '../utils/accessibility';

// ============================================================
// Storage keys
// ============================================================

const FONT_SIZE_KEY = 'a11y-font-size';
const LINE_HEIGHT_KEY = 'a11y-line-height';
const REDUCED_MOTION_KEY = 'a11y-reduced-motion';
const SR_ANNOUNCE_KEY = 'a11y-sr-announce';
const VERBOSE_KEY = 'a11y-verbose';

function getStored(key: string, fallback: number): number {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? Number(val) : fallback;
  } catch {
    return fallback;
  }
}

// ============================================================
// Accessibility audit checklist
// ============================================================

interface AuditItem {
  labelKey: string;
  passed: boolean;
}

const AUDIT_ITEMS: AuditItem[] = [
  { labelKey: 'a11y.audit.skipNav', passed: true },
  { labelKey: 'a11y.audit.ariaLabels', passed: true },
  { labelKey: 'a11y.audit.focusManagement', passed: true },
  { labelKey: 'a11y.audit.colorContrast', passed: true },
  { labelKey: 'a11y.audit.keyboardNav', passed: true },
  { labelKey: 'a11y.audit.screenReader', passed: true },
  { labelKey: 'a11y.audit.reducedMotion', passed: true },
  { labelKey: 'a11y.audit.highContrast', passed: true },
];

// ============================================================
// Keyboard shortcuts reference
// ============================================================

interface ShortcutItem {
  keys: string[];
  descKey: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Tab'], descKey: 'a11y.shortcuts.tab' },
  { keys: ['Enter', '/', 'Space'], descKey: 'a11y.shortcuts.enter' },
  { keys: ['Escape'], descKey: 'a11y.shortcuts.escape' },
  { keys: ['Arrow Up', 'Arrow Down'], descKey: 'a11y.shortcuts.arrows' },
  { keys: ['Ctrl', 'K'], descKey: 'a11y.shortcuts.ctrlK' },
  { keys: ['Ctrl', '/'], descKey: 'a11y.shortcuts.ctrlSlash' },
];

// ============================================================
// Component
// ============================================================

export default function AccessibilityPage() {
  const { t } = useTranslation();
  useSeo('accessibility');

  // ---- Display Settings State ----
  const [fontSize, setFontSize] = useState(() => getStored(FONT_SIZE_KEY, 16));
  const [lineHeight, setLineHeight] = useState(() => getStored(LINE_HEIGHT_KEY, 150));
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      const stored = localStorage.getItem(REDUCED_MOTION_KEY);
      if (stored !== null) return stored === 'true';
      return prefersReducedMotion();
    } catch {
      return prefersReducedMotion();
    }
  });
  const [srAnnounce, setSrAnnounce] = useState(() => {
    try { return localStorage.getItem(SR_ANNOUNCE_KEY) !== 'false'; } catch { return true; }
  });
  const [verbose, setVerbose] = useState(() => {
    try { return localStorage.getItem(VERBOSE_KEY) === 'true'; } catch { return false; }
  });

  // ---- Apply font size ----
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    try { localStorage.setItem(FONT_SIZE_KEY, String(fontSize)); } catch { /* noop */ }
  }, [fontSize]);

  // ---- Apply line height ----
  useEffect(() => {
    document.documentElement.style.lineHeight = `${(lineHeight / 100).toFixed(2)}`;
    try { localStorage.setItem(LINE_HEIGHT_KEY, String(lineHeight)); } catch { /* noop */ }
  }, [lineHeight]);

  // ---- Apply reduced motion ----
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
    try { localStorage.setItem(REDUCED_MOTION_KEY, String(reducedMotion)); } catch { /* noop */ }
  }, [reducedMotion]);

  // ---- Persist screen reader & verbose toggles ----
  useEffect(() => {
    try { localStorage.setItem(SR_ANNOUNCE_KEY, String(srAnnounce)); } catch { /* noop */ }
  }, [srAnnounce]);

  useEffect(() => {
    try { localStorage.setItem(VERBOSE_KEY, String(verbose)); } catch { /* noop */ }
  }, [verbose]);

  // ---- Test announcement ----
  const testAnnouncement = useCallback(() => {
    if (srAnnounce) {
      announceToScreenReader(verbose ? t('a11y.testAnnouncementVerbose') : t('a11y.testAnnouncement'));
    }
  }, [srAnnounce, verbose, t]);

  // ---- Reset all ----
  const resetAll = useCallback(() => {
    setFontSize(16);
    setLineHeight(150);
    setReducedMotion(prefersReducedMotion());
    setSrAnnounce(true);
    setVerbose(false);
    document.documentElement.removeAttribute('data-high-contrast');
    try {
      localStorage.removeItem(FONT_SIZE_KEY);
      localStorage.removeItem(LINE_HEIGHT_KEY);
      localStorage.removeItem(REDUCED_MOTION_KEY);
      localStorage.removeItem(SR_ANNOUNCE_KEY);
      localStorage.removeItem(VERBOSE_KEY);
      localStorage.removeItem('a11y-high-contrast');
    } catch { /* noop */ }
    announceToScreenReader(t('a11y.resetSuccess'));
  }, [t]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            {t('a11y.pageTitle')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('a11y.pageDesc')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Section 1: Display Settings */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" aria-labelledby="a11y-display-heading">
          <h2 id="a11y-display-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
            {t('a11y.displaySettings')}
          </h2>

          <div className="space-y-6">
            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="a11y-font-size" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('a11y.fontSize')}
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{fontSize}px</span>
              </div>
              <input
                id="a11y-font-size"
                type="range"
                min={12}
                max={24}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                aria-valuemin={12}
                aria-valuemax={24}
                aria-valuenow={fontSize}
                aria-valuetext={`${fontSize} pixels`}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>12px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="a11y-line-height" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('a11y.lineHeight')}
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{(lineHeight / 100).toFixed(2)}</span>
              </div>
              <input
                id="a11y-line-height"
                type="range"
                min={100}
                max={200}
                step={10}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                aria-valuemin={100}
                aria-valuemax={200}
                aria-valuenow={lineHeight}
                aria-valuetext={`${(lineHeight / 100).toFixed(2)}`}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1.0</span>
                <span>2.0</span>
              </div>
            </div>

            {/* High Contrast */}
            <HighContrastToggle />

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('a11y.reducedMotion')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('a11y.reducedMotionDesc')}
                </p>
              </div>
              <button
                onClick={() => setReducedMotion((prev) => !prev)}
                role="switch"
                aria-checked={reducedMotion}
                aria-label={t('a11y.reducedMotion')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  reducedMotion
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    reducedMotion ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Keyboard Shortcuts */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" aria-labelledby="a11y-nav-heading">
          <h2 id="a11y-nav-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('a11y.navigationSettings')}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                    {t('a11y.shortcut')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                    {t('a11y.description')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {SHORTCUTS.map((shortcut) => (
                  <tr key={shortcut.descKey}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-xs text-gray-400">+</span>}
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {t(shortcut.descKey)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Screen Reader Settings */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" aria-labelledby="a11y-sr-heading">
          <h2 id="a11y-sr-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            {t('a11y.screenReaderSettings')}
          </h2>

          <div className="space-y-6">
            {/* Screen reader announcements */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('a11y.srAnnouncements')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('a11y.srAnnouncementsDesc')}
                </p>
              </div>
              <button
                onClick={() => setSrAnnounce((prev) => !prev)}
                role="switch"
                aria-checked={srAnnounce}
                aria-label={t('a11y.srAnnouncements')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  srAnnounce
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    srAnnounce ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Verbose mode */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('a11y.verboseMode')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('a11y.verboseModeDesc')}
                </p>
              </div>
              <button
                onClick={() => setVerbose((prev) => !prev)}
                role="switch"
                aria-checked={verbose}
                aria-label={t('a11y.verboseMode')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  verbose
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    verbose ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Test button */}
            <button
              onClick={testAnnouncement}
              disabled={!srAnnounce}
              className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('a11y.testAnnouncement')}
            </button>
          </div>
        </section>

        {/* Section 4: Accessibility Audit */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6" aria-labelledby="a11y-audit-heading">
          <h2 id="a11y-audit-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            {t('a11y.auditTitle')}
          </h2>

          <ul className="space-y-3" role="list" aria-label={t('a11y.auditTitle')}>
            {AUDIT_ITEMS.map((item) => (
              <li key={item.labelKey} className="flex items-center gap-3">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    item.passed
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}
                  role="img"
                  aria-label={item.passed ? 'Passed' : 'Failed'}
                >
                  {item.passed ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{t(item.labelKey)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Reset Button */}
        <div className="flex justify-end">
          <button
            onClick={resetAll}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {t('a11y.resetAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
