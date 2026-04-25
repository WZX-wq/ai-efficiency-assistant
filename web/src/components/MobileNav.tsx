import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

interface NavTab {
  to: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[];
  /** 当为数字 > 0 时显示数字角标；当为 true 时显示红点；undefined/false 不显示 */
  badge?: number | boolean;
}

const tabs: NavTab[] = [
  {
    to: '/',
    label: '首页',
    matchPaths: ['/'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/workspace',
    label: '工具',
    matchPaths: ['/workspace'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    to: '/services',
    label: '服务',
    matchPaths: ['/services'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
  },
  {
    to: '/workspace/history',
    label: '历史',
    matchPaths: ['/workspace/history'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: '设置',
    matchPaths: ['/settings'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

function isActiveTab(pathname: string, tab: NavTab): boolean {
  if (tab.to === '/') return pathname === '/';
  return tab.matchPaths?.some((p) => pathname.startsWith(p)) ?? pathname.startsWith(tab.to);
}

function Badge({ badge }: { badge?: number | boolean }) {
  if (badge === undefined || badge === false) return null;

  if (typeof badge === 'number' && badge > 0) {
    return (
      <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
        {badge > 99 ? '99+' : badge}
      </span>
    );
  }

  if (badge === true) {
    return (
      <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full" />
    );
  }

  return null;
}

export default function MobileNav() {
  const location = useLocation();
  const { theme, setTheme } = useAppStore();

  const darkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleDarkMode = () => {
    setTheme(darkMode ? 'light' : 'dark');
  };

  return (
    <nav
      role="navigation"
      aria-label="主导航"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden"
    >
      <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {tabs.map((tab, index) => {
          const active = isActiveTab(location.pathname, tab);

          // 在"工具"和"服务"之间插入快捷操作按钮
          if (index === 2) {
            return (
              <React.Fragment key="quick-action">
                <Link
                  to="/workspace"
                  aria-label="快捷工作台"
                  className="flex flex-col items-center justify-center flex-1 min-w-0"
                >
                  <div className="relative -mt-4 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 transition-transform duration-200 hover:scale-105 active:scale-95">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-[10px] leading-tight font-medium mt-0.5 text-gray-400 dark:text-gray-500">
                    快捷
                  </span>
                </Link>
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 px-1 rounded-lg transition-colors duration-200 ${
                    active
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <div className="relative">
                    {active && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
                    )}
                    <span
                      className={`transition-transform duration-200 ${
                        active ? 'scale-110' : 'scale-100'
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <Badge badge={tab.badge} />
                  </div>
                  <span className="text-[10px] leading-tight font-medium truncate w-full text-center">
                    {tab.label}
                  </span>
                </Link>
              </React.Fragment>
            );
          }

          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 px-1 rounded-lg transition-colors duration-200 ${
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <div className="relative">
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
                )}
                <span
                  className={`transition-transform duration-200 ${
                    active ? 'scale-110' : 'scale-100'
                  }`}
                >
                  {tab.icon}
                </span>
                <Badge badge={tab.badge} />
              </div>
              <span className="text-[10px] leading-tight font-medium truncate w-full text-center">
                {tab.label}
              </span>
            </Link>
          );
        })}
        {/* 暗色模式切换按钮 */}
        <button
          onClick={toggleDarkMode}
          aria-label={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
          className="relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 px-1 rounded-lg transition-colors duration-200 text-gray-400 dark:text-gray-500"
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
          <span className="text-[10px] leading-tight font-medium truncate w-full text-center">
            {darkMode ? '亮色' : '暗色'}
          </span>
        </button>
      </div>
    </nav>
  );
}
