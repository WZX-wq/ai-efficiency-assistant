import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // 首页不显示进度条（Hero 区域不需要）
  if (location.pathname === '/' || location.pathname === '/ai-efficiency-assistant') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
