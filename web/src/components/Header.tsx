import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useThemeStore } from '../store/useThemeStore';
import { useUserStore } from '../store/userStore';
import { NotificationBell } from './NotificationCenter';
import { useTranslation, supportedLocales, localeLabels } from '../i18n';
import type { Locale } from '../i18n';

const toolLinkItems = [
  { to: '/plugins', labelKey: 'header.pluginStore', icon: '🧩' },
  { to: '/workspace', labelKey: 'header.workspace', icon: '⚡' },
  { to: '/workspace/creative', labelKey: 'header.creative', icon: '🎨' },
  { to: '/workspace/calendar', labelKey: 'header.calendar', icon: '📅' },
  { to: '/workspace/scripts', labelKey: 'header.scripts', icon: '💬' },
  { to: '/workspace/copywriting', labelKey: 'header.copywriting', icon: '✍️' },
  { to: '/workspace/history', labelKey: 'header.history', icon: '📋' },
  { to: '/workspace/brand', labelKey: 'header.brand', icon: '🎨' },
  { to: '/workspace/seo', labelKey: 'header.seo', icon: '🔍' },
  { to: '/workspace/templates', labelKey: 'header.templates', icon: '📑' },
  { to: '/workspace/humanize', labelKey: 'header.humanize', icon: '🧑' },
  { to: '/workspace/polish', labelKey: 'header.polish', icon: '✨' },
  { to: '/workspace/rewrite', labelKey: 'header.rewrite', icon: '🔄' },
  { to: '/workspace/summarizer', labelKey: 'header.summarizer', icon: '📝' },
  { to: '/workspace/longform', labelKey: 'header.longform', icon: '📖' },
  { to: '/workspace/continue', labelKey: 'header.continue', icon: '✍️' },
  { to: '/workspace/translation', labelKey: 'header.translation', icon: '🌐' },
  { to: '/workspace/doc-analysis', labelKey: 'header.docAnalysis', icon: '📄' },
  { to: '/workspace/mindmap', labelKey: 'header.mindmap', icon: '🧠' },
  { to: '/workspace/life-assistant', labelKey: 'header.lifeAssistant', icon: '🌿' },
  { to: '/workspace/marketing', labelKey: 'header.marketing', icon: '📣' },
  { to: '/workspace/fiction', labelKey: 'header.fiction', icon: '📖' },
  { to: '/workspace/ppt-generator', labelKey: 'header.pptGenerator', icon: '📊' },
  { to: '/workspace/data-analysis', labelKey: 'header.dataAnalysis', icon: '📈' },
  { to: '/workflows', labelKey: 'header.workflows', icon: '⚡' },
  { to: '/workflow-dashboard', labelKey: 'header.workflowDashboard', icon: '📊' },
  { to: '/canvas', labelKey: 'header.canvas', icon: '🎨' },
  { to: '/team', labelKey: 'header.team', icon: '👥' },
  { to: '/voice', labelKey: 'header.voice', icon: '🎤' },
  { to: '/files', labelKey: 'header.files', icon: '📁' },
  { to: '/dataviz', labelKey: 'header.dataviz', icon: '📊' },
  { to: '/images', labelKey: 'header.images', icon: '🖼️' },
  { to: '/spreadsheet', labelKey: 'header.spreadsheet', icon: '📈' },
  { to: '/extensions', labelKey: 'header.extensions', icon: '🔌' },
];

export default function Header() {
  const { t, locale, setLocale } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const toolLinks = useMemo(() => toolLinkItems.map(item => ({ ...item, label: t(item.labelKey) })), [t]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolboxSearch, setToolboxSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { toggleAiPanel } = useAppStore();
  const { isDark, toggleDark, currentTheme } = useThemeStore();
  const navigate = useNavigate();
  const { user, isAuthenticated, isDemoMode } = useUserStore();

  const darkMode = isDark;

  const navLinks = useMemo(() => [
    { to: '/', label: t('header.home') },
    { to: '/chat', label: t('header.aiChat') },
    { to: '/templates', label: t('header.templateMarket') },
    { to: '/services', label: t('header.services') },
    { to: '/playground', label: t('header.playground') },
    { to: '/api-platform', label: t('header.apiPlatform') },
    { to: '/dashboard', label: t('header.dashboard') },
    { to: '/pricing', label: t('header.pricing') },
  ], [t]);

  const isActive = (path: string) => location.pathname === path;
  const isToolsActive = location.pathname.startsWith('/workspace');

  // 滚动监听 - 添加阴影效果
  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setMobileMenuOpen(false);
    setToolsOpen(false);
  }, [location.pathname]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 阻止 body 滚动（移动菜单打开时）
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 transition-shadow duration-300 ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                AI<span className="text-primary-600">效率助手</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1" aria-label="主导航">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* 工具下拉菜单 */}
              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  aria-expanded={toolsOpen}
                  aria-haspopup="true"
                  aria-controls="tools-dropdown"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isToolsActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('header.toolbox')}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {toolsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      id="tools-dropdown"
                      className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 origin-top"
                    >
                    <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                      <input
                        type="text"
                        value={toolboxSearch}
                        onChange={(e) => setToolboxSearch(e.target.value)}
                        placeholder={t('header.searchTools')}
                        aria-label={t('header.searchTools')}
                        className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                    </div>
                    {(() => {
                      const coreTools = toolLinks.slice(0, 4).filter(t => t.label.includes(toolboxSearch));
                      const creativeTools = toolLinks.slice(4).filter(t => t.label.includes(toolboxSearch));
                      if (coreTools.length === 0 && creativeTools.length === 0) {
                        return <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">{t('header.noToolFound')}</div>;
                      }
                      return (
                        <>
                          {coreTools.length > 0 && (
                            <>
                              <div className="px-3 py-1.5">
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('header.coreTools')}</p>
                              </div>
                              {coreTools.map((tool) => (
                                <Link
                                  key={tool.to}
                                  to={tool.to}
                                  onClick={() => setToolsOpen(false)}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                    isActive(tool.to)
                                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                  }`}
                                >
                                  <span className="text-base">{tool.icon}</span>
                                  {tool.label}
                                </Link>
                              ))}
                            </>
                          )}
                          {creativeTools.length > 0 && (
                            <>
                              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                              <div className="px-3 py-1.5">
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('header.creationTools')}</p>
                              </div>
                              {creativeTools.map((tool) => (
                                <Link
                                  key={tool.to}
                                  to={tool.to}
                                  onClick={() => setToolsOpen(false)}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                    isActive(tool.to)
                                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                  }`}
                                >
                                  <span className="text-base">{tool.icon}</span>
                                  {tool.label}
                                </Link>
                              ))}
                            </>
                          )}
                        </>
                      );
                    })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-2">
              {/* AI 助手按钮 */}
              <button
                onClick={toggleAiPanel}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                title={t('header.aiAssistantTooltip')}
                aria-label={t('header.aiAssistant')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                <span className="hidden lg:inline">{t('header.aiAssistant')}</span>
              </button>

              {/* 登录按钮 / 用户头像 */}
              {isAuthenticated && user ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <img src={user.avatar} alt={user.username} className="w-6 h-6 rounded-full" />
                  <span className="hidden lg:inline max-w-[80px] truncate">{user.username}</span>
                  {isDemoMode && (
                    <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                      {t('header.demoMode')}
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t('header.login')}
                </Link>
              )}

              {/* 设置按钮 */}
              <Link
                to="/settings"
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t('common.settings')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </Link>
              {/* 通知中心 */}
              <NotificationBell />
              {/* 语言切换 */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Language"
                  aria-expanded={langOpen}
                  aria-controls="lang-dropdown"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                  </svg>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      id="lang-dropdown"
                      className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 origin-top z-50"
                    >
                      {supportedLocales.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => { setLocale(loc as Locale); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            locale === loc
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {localeLabels[loc as Locale]}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* 暗黑模式切换 / 主题设置 */}
              <div className="relative group">
                <button
                  onClick={toggleDark}
                  onContextMenu={(e) => { e.preventDefault(); navigate('/theme-settings'); }}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                  aria-label={t('header.toggleDarkMode')}
                  title={t('theme.themeTooltip')}
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {/* Theme color indicator dot */}
                  <span
                    className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white dark:border-gray-800"
                    style={{ backgroundColor: currentTheme.primaryColor === 'blue' ? '#3b82f6' : currentTheme.primaryColor === 'emerald' ? '#10b981' : currentTheme.primaryColor === 'orange' ? '#f97316' : currentTheme.primaryColor === 'violet' ? '#8b5cf6' : currentTheme.primaryColor === 'rose' ? '#f43f5e' : currentTheme.primaryColor === 'indigo' ? '#6366f1' : currentTheme.primaryColor === 'slate' ? '#64748b' : currentTheme.primaryColor === 'yellow' ? '#eab308' : '#3b82f6' }}
                  />
                </button>
                {/* Tooltip on hover */}
                <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {t('theme.themeTooltip')} (右键打开)
                </div>
              </div>
              <Link
                to="/workspace"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
              >
                {t('header.startFree')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('header.toggleMenu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-900 lg:hidden"
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('header.toggleMenu')}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Menu Panel */}
            <div className="absolute top-16 left-0 right-0 bottom-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-y-auto animate-slide-down">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.to)
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Mobile 工具箱 */}
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('header.toolbox')}</p>
                  {toolLinks.map((tool) => (
                    <Link
                      key={tool.to}
                      to={tool.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive(tool.to)
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-base">{tool.icon}</span>
                      {tool.label}
                    </Link>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { toggleAiPanel(); setMobileMenuOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0-3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                    {t('header.aiAssistant')}
                  </button>
                  <Link
                    to="/workspace"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg text-center hover:bg-primary-700 transition-colors"
                  >
                    {t('header.startFree')}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
