import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const BORDER_COLORS: Record<Toast['type'], string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
  warning: 'border-l-yellow-500',
};

const ICON_COLORS: Record<Toast['type'], string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
};

const BG_COLORS: Record<Toast['type'], string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
};

const DEFAULT_DURATIONS: Record<Toast['type'], number> = {
  success: 2000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

function ToastIcon({ type }: { type: Toast['type'] }) {
  const cls = `w-5 h-5 ${ICON_COLORS[type]}`;
  switch (type) {
    case 'success':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
    case 'error':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'warning':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'info':
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const pausedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

  const startTimer = useCallback(() => {
    // 恢复时调整起始时间，扣除暂停期间的时间
    if (pausedAtRef.current > 0) {
      startRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleDismiss();
      }
    }, 50);
  }, [toast.duration, handleDismiss]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pausedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    startRef.current = Date.now();
    pausedAtRef.current = 0;
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [toast.duration, startTimer]);

  return (
    <div
      className={`relative flex items-start gap-3 w-full md:w-80 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 border-l-4 ${BORDER_COLORS[toast.type]} transition-all duration-300 ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
      onMouseEnter={() => {
        stopTimer();
      }}
      onMouseLeave={() => {
        startTimer();
      }}
    >
      <ToastIcon type={toast.type} />
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200 leading-snug">{toast.message}</p>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-700 rounded-b-lg overflow-hidden">
        <div className={`h-full ${BG_COLORS[toast.type]} transition-all duration-100 ease-linear`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

const MAX_TOASTS = 3;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: Toast['type'] = 'info', duration?: number) => {
    const id = `toast-${++counterRef.current}`;
    const actualDuration = duration ?? DEFAULT_DURATIONS[type];
    setToasts((prev) => {
      const next = [...prev, { id, type, message, duration: actualDuration }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 md:top-20 md:right-4 md:left-auto md:bottom-auto z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
