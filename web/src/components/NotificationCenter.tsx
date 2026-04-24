import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useNotificationStore,
  type Notification,
} from '../store/notificationStore';

// ─── 相对时间格式化 ────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  // 超过7天显示日期
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ─── 通知类型图标配置 ───────────────────────────────────────────────

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  system: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  success: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/30',
  },
  error: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/30',
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    ),
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
  },
};

// ─── 单条通知项 ─────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  onRemove,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type];

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
        notification.read
          ? 'bg-white dark:bg-gray-800/50'
          : 'bg-primary-50/50 dark:bg-primary-900/10'
      } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
    >
      {/* 类型图标 */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${config.bg} ${config.color}`}
      >
        {config.icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-medium truncate ${
              notification.read
                ? 'text-gray-600 dark:text-gray-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        className="flex-shrink-0 p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="删除通知"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─── 空状态 ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <svg
        className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>
      <p className="text-sm text-gray-400 dark:text-gray-500">暂无通知</p>
    </div>
  );
}

// ─── 铃铛图标 ───────────────────────────────────────────────────────

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

// ─── 通知中心面板（受控模式） ───────────────────────────────────────

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    unreadCount,
  } = useNotificationStore();

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // 延迟绑定，避免当前点击事件立即关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;

    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const unread = unreadCount();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层（移动端） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 md:hidden"
            onClick={onClose}
          />

          {/* 面板 */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            {/* 面板头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  通知中心
                </h3>
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-2.5 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                  >
                    全部已读
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    清空
                  </button>
                )}
              </div>
            </div>

            {/* 通知列表 */}
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
              <AnimatePresence mode="popLayout">
                {notifications.length === 0 ? (
                  <EmptyState key="empty" />
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onRemove={removeNotification}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── 独立铃铛按钮（自带 open/close 状态管理） ────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`通知${unread > 0 ? ` (${unread}条未读)` : ''}`}
      >
        <BellIcon className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ─── 便捷 Hook ─────────────────────────────────────────────────────

/**
 * 便捷通知 Hook，提供 `notify(title, message, type)` 快捷方法
 *
 * @example
 * ```tsx
 * const { notify } = useNotification();
 * notify('生成完成', '您的文章已成功生成', 'success');
 * ```
 */
export function useNotification() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const notify = useCallback(
    (
      title: string,
      message: string,
      type: Notification['type'] = 'info'
    ) => {
      addNotification({ title, message, type });
    },
    [addNotification]
  );

  return { notify };
}
