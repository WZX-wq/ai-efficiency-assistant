import { useState, useEffect, useCallback } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(() => window.scrollY > 300);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > 300);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="回到顶部"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`
        fixed bottom-20 right-4 z-30
        md:bottom-8 md:right-6
        w-10 h-10 rounded-full
        flex items-center justify-center
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        shadow-lg
        text-gray-600 dark:text-gray-300
        hover:text-primary-600 dark:hover:text-primary-400
        hover:border-primary-300 dark:hover:border-primary-600
        transition-all duration-300
        ${
          visible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
