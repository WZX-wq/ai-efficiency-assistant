import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useThemeStore, PRESET_THEMES, type ThemeConfig } from '../store/useThemeStore';
import { useSeo } from '../components/SeoHead';
import { useTranslation } from '../i18n';

const COLOR_OPTIONS = [
  'blue', 'indigo', 'violet', 'purple', 'rose', 'pink',
  'red', 'orange', 'amber', 'emerald', 'teal', 'cyan',
];

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7',
  rose: '#f43f5e', pink: '#ec4899', red: '#ef4444', orange: '#f97316',
  amber: '#f59e0b', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4',
  yellow: '#eab308', slate: '#64748b', gray: '#6b7280',
};

const RADIUS_OPTIONS: { value: ThemeConfig['borderRadius']; label: string; labelEn: string }[] = [
  { value: 'none', label: '无', labelEn: 'None' },
  { value: 'sm', label: '小', labelEn: 'Small' },
  { value: 'md', label: '中', labelEn: 'Medium' },
  { value: 'lg', label: '大', labelEn: 'Large' },
  { value: 'xl', label: '超大', labelEn: 'XL' },
];

const FONT_SIZE_OPTIONS: { value: ThemeConfig['fontSize']; label: string; labelEn: string }[] = [
  { value: 'sm', label: '小', labelEn: 'Small' },
  { value: 'md', label: '中', labelEn: 'Medium' },
  { value: 'lg', label: '大', labelEn: 'Large' },
];

const FONT_FAMILY_OPTIONS: { value: ThemeConfig['fontFamily']; label: string; labelEn: string }[] = [
  { value: 'default', label: '默认', labelEn: 'Default' },
  { value: 'serif', label: '衬线', labelEn: 'Serif' },
  { value: 'mono', label: '等宽', labelEn: 'Mono' },
];

/** Mini preview component showing theme in action */
function ThemePreview({ theme, isDark }: { theme: ThemeConfig; isDark: boolean }) {
  const primaryHex = COLOR_HEX[theme.primaryColor] || '#3b82f6';
  const accentHex = COLOR_HEX[theme.accentColor] || '#06b6d4';
  const radiusMap: Record<string, string> = { none: '0px', sm: '4px', md: '8px', lg: '12px', xl: '16px' };
  const radius = radiusMap[theme.borderRadius] || '8px';
  const bg = isDark ? '#111827' : '#ffffff';
  const text = isDark ? '#f3f4f6' : '#111827';
  const subtext = isDark ? '#9ca3af' : '#6b7280';
  const border = isDark ? '#374151' : '#e5e7eb';
  const fontFamilyMap: Record<string, string> = {
    default: "system-ui, sans-serif",
    serif: "Georgia, serif",
    mono: "'Fira Code', monospace",
  };
  const ff = fontFamilyMap[theme.fontFamily] || fontFamilyMap.default;

  return (
    <div
      style={{
        background: bg,
        borderRadius: radius,
        border: `1px solid ${border}`,
        padding: '16px',
        fontFamily: ff,
        fontSize: theme.fontSize === 'sm' ? '12px' : theme.fontSize === 'lg' ? '15px' : '13px',
        color: text,
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: radius, background: `linear-gradient(135deg, ${primaryHex}, ${accentHex})` }} />
        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: isDark ? '#374151' : '#f3f4f6' }} />
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: isDark ? '#374151' : '#e5e7eb' }} />
      </div>
      {/* Content */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: 1, height: '48px', borderRadius: radius, background: isDark ? '#1f2937' : '#f9fafb', border: `1px solid ${border}` }} />
        <div style={{ flex: 1, height: '48px', borderRadius: radius, background: isDark ? '#1f2937' : '#f9fafb', border: `1px solid ${border}` }} />
        <div style={{ flex: 1, height: '48px', borderRadius: radius, background: isDark ? '#1f2937' : '#f9fafb', border: `1px solid ${border}` }} />
      </div>
      {/* Text lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ width: '80%', height: '8px', borderRadius: '4px', background: primaryHex, opacity: 0.8 }} />
        <div style={{ width: '60%', height: '6px', borderRadius: '3px', background: subtext, opacity: 0.4 }} />
        <div style={{ width: '70%', height: '6px', borderRadius: '3px', background: subtext, opacity: 0.3 }} />
      </div>
      {/* Button */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <div style={{ padding: '4px 12px', borderRadius: radius, background: primaryHex, color: '#fff', fontSize: '11px', fontWeight: 500 }}>
          Button
        </div>
        <div style={{ padding: '4px 12px', borderRadius: radius, border: `1px solid ${border}`, color: subtext, fontSize: '11px' }}>
          Cancel
        </div>
      </div>
    </div>
  );
}

export default function ThemeSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    currentTheme, customThemes, isDark,
    setTheme, toggleDark,
    setPrimaryColor, setAccentColor,
    setBorderRadius, setFontSize, setFontFamily,
    saveCustomTheme, deleteCustomTheme, resetToDefault,
  } = useThemeStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');

  useSeo({
    title: `${t('theme.title')} - AI效率助手`,
    description: t('theme.description'),
    canonicalUrl: '/theme-settings',
  });

  const isPresetTheme = useMemo(
    () => PRESET_THEMES.some((pt) => pt.name === currentTheme.name),
    [currentTheme.name]
  );

  const handleSaveCustomTheme = () => {
    if (!customThemeName.trim()) return;
    saveCustomTheme({
      ...currentTheme,
      name: customThemeName.trim(),
      label: customThemeName.trim(),
    });
    setCustomThemeName('');
    setSaveDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.back')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('theme.title')}</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{t('theme.description')}</p>
        </div>

        {/* Section 1: Preset Themes */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('theme.presetThemes')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PRESET_THEMES.map((preset) => {
              const isActive = currentTheme.name === preset.name && isPresetTheme;
              const primaryHex = COLOR_HEX[preset.primaryColor] || '#3b82f6';
              const accentHex = COLOR_HEX[preset.accentColor] || '#06b6d4';
              return (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(preset)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {/* Color swatch */}
                  <div className="flex gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ background: primaryHex }} />
                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ background: accentHex }} />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{preset.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {preset.mode === 'dark' ? t('theme.dark') : t('theme.light')}
                  </p>
                  {/* Mini preview */}
                  <div className="mt-3">
                    <ThemePreview theme={preset} isDark={preset.mode === 'dark'} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Custom Theme Editor */}
        <section className="mb-10 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('theme.customEditor')}</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Controls */}
            <div className="space-y-6">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('theme.primaryColor')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        currentTheme.primaryColor === color
                          ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110'
                          : 'hover:scale-110'
                      }`}
                      style={{ background: COLOR_HEX[color] }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('theme.accentColor')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        currentTheme.accentColor === color
                          ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110'
                          : 'hover:scale-110'
                      }`}
                      style={{ background: COLOR_HEX[color] }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('theme.borderRadius')}
                </label>
                <div className="flex gap-2">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBorderRadius(opt.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        currentTheme.borderRadius === opt.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('theme.fontSize')}
                </label>
                <div className="flex gap-2">
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        currentTheme.fontSize === opt.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('theme.fontFamily')}
                </label>
                <div className="flex gap-2">
                  {FONT_FAMILY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFontFamily(opt.value)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        currentTheme.fontFamily === opt.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-medium'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('theme.livePreview')}
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900">
                <ThemePreview theme={currentTheme} isDark={isDark} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Custom Themes Management */}
        <section className="mb-10 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('theme.customThemes')}</h2>
            <button
              onClick={() => setSaveDialogOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {t('theme.saveCurrent')}
            </button>
          </div>

          {customThemes.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">{t('theme.noCustomThemes')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customThemes.map((ct) => {
                const isActive = currentTheme.name === ct.name && !isPresetTheme;
                const primaryHex = COLOR_HEX[ct.primaryColor] || '#3b82f6';
                return (
                  <div
                    key={ct.name}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full" style={{ background: primaryHex }} />
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{ct.label}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setTheme(ct)}
                          className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        >
                          {t('theme.use')}
                        </button>
                        <button
                          onClick={() => deleteCustomTheme(ct.name)}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                    <ThemePreview theme={ct} isDark={ct.mode === 'dark'} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 4: Dark Mode */}
        <section className="mb-10 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('theme.darkMode')}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 dark:text-gray-300">{t('theme.darkModeDesc')}</p>
            </div>
            <button
              onClick={toggleDark}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                isDark ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={isDark}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                  isDark ? 'translate-x-7.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-xl border-2 transition-all ${!isDark ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('theme.light')}</p>
              <ThemePreview theme={currentTheme} isDark={false} />
            </div>
            <div className={`p-3 rounded-xl border-2 transition-all ${isDark ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('theme.dark')}</p>
              <ThemePreview theme={currentTheme} isDark={true} />
            </div>
          </div>
        </section>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={resetToDefault}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('theme.resetDefault')}
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('theme.saveDialogTitle')}</h3>
            <input
              type="text"
              value={customThemeName}
              onChange={(e) => setCustomThemeName(e.target.value)}
              placeholder={t('theme.themeNamePlaceholder')}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomTheme()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setSaveDialogOpen(false); setCustomThemeName(''); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveCustomTheme}
                disabled={!customThemeName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
