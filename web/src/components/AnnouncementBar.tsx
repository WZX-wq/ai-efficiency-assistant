import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_VERSION } from '../version';

const STORAGE_KEY = 'ai-assistant-announcement-version';

const announcements = [
  `🎉 AI效率助手 ${APP_VERSION} 企业级升级完成！新增富文本编辑器、AI写作助手等核心功能`,
  '✨ 全新 PWA 支持：可安装到桌面，离线也能使用',
  '🚀 新增 14+ AI 工具，覆盖内容创作全流程',
];

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === APP_VERSION;
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(!dismissed);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (dismissed) {
      setVisible(false);
    }
  }, [dismissed]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(goToNext, 5000);
    return () => clearInterval(timer);
  }, [dismissed, goToNext]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {
      // ignore storage errors
    }
    setDismissed(true);
  };

  if (dismissed && !visible) return null;

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
        visible ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/20">
        <div className="flex items-center justify-center h-10 px-4 text-sm">
          <button
            onClick={goToPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors"
            aria-label="上一条公告"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <span className="flex items-center gap-2 text-primary-700 dark:text-primary-300 mx-8">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="inline-flex items-center gap-2"
              >
                <span>{announcements[currentIndex]}</span>
                <Link
                  to="/workspace"
                  className="inline-flex items-center font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 whitespace-nowrap"
                >
                  了解更多 →
                </Link>
              </motion.span>
            </AnimatePresence>
          </span>

          <button
            onClick={goToNext}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-full text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors"
            aria-label="下一条公告"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            onClick={handleDismiss}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 hover:bg-primary-200/50 dark:hover:bg-primary-800/50 transition-colors"
            aria-label="关闭公告"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
