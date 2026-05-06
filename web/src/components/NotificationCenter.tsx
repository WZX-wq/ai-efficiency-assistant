import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '../i18n';
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
  type NotificationPreferences,
} from '../store/useNotificationStore';

// ─── Constants ──────────────────────────────────────────────────────

const VISIBLE_COUNT = 10;
const TOAST_DURATION = 5000;

const FILTER_TABS: Array<{ key: 'all' | NotificationType; labelKey: string }> = [
  { key: 'all', labelKey: 'notification.filterAll' },
  { key: 'system', labelKey: 'notification.filterSystem' },
  { key: 'update', labelKey: 'notification.filterUpdate' },
  { key: 'achievement', labelKey: 'notification.filterAchievement' },
  { key: 'collaboration', labelKey: 'notification.filterCollaboration' },
  { key: 'reminder', labelKey: 'notification.filterReminder' },
  { key: 'tip', labelKey: 'notification.filterTip' },
];

const TYPE_EMOJI: Record<NotificationType, string> = {
  system: '⚙️',
  update: '🚀',
  achievement: '🏆',
  collaboration: '👥',
  reminder: '⏰',
  tip: '💡',
  error: '⚠️',
  success: '✅',
};

const TYPE_BG: Record<NotificationType, string> = {
  system: 'bg-gray-100 dark:bg-gray-700',
  update: 'bg-blue-50 dark:bg-blue-900/30',
  achievement: 'bg-amber-50 dark:bg-amber-900/30',
  collaboration: 'bg-purple-50 dark:bg-purple-900/30',
  reminder: 'bg-orange-50 dark:bg-orange-900/30',
  tip: 'bg-emerald-50 dark:bg-emerald-900/30',
  error: 'bg-red-50 dark:bg-red-900/30',
  success: 'bg-green-50 dark:bg-green-900/30',
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-gray-900',
  low: 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
};

// ─── Helpers ────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

type TimeGroup = 'justNow' | 'today' | 'yesterday' | 'earlier';

function getTimeGroup(timestamp: number): TimeGroup {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;

  if (timestamp >= todayStart) {
    const diff = now.getTime() - timestamp;
    if (diff < 60 * 60 * 1000) return 'justNow';
    return 'today';
  }
  if (timestamp >= yesterdayStart) return 'yesterday';
  return 'earlier';
}

function groupByTime(notifications: Notification[]): Array<{ group: TimeGroup; items: Notification[] }> {
  const groups: Record<TimeGroup, Notification[]> = {
    justNow: [],
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const n of notifications) {
    const g = getTimeGroup(n.timestamp);
    groups[g].push(n);
  }
  const order: TimeGroup[] = ['justNow', 'today', 'yesterday', 'earlier'];
  return order
    .filter((g) => groups[g].length > 0)
    .map((g) => ({ group: g, items: groups[g] }));
}

// ─── NotificationToast ─────────────────────────────────────────────

function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(notification.id);
    }, TOAST_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, onDismiss]);

  const emoji = notification.icon || TYPE_EMOJI[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 300, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden pointer-events-auto"
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />

      <div className="flex items-start gap-3 p-4 pt-5">
        <span className="flex-shrink-0 text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {notification.title}
            </p>
            {notification.priority === 'urgent' && (
              <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white">
                {t('notification.priorities.urgent')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('common.close')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ─── NotificationPreferences Modal ──────────────────────────────────

function NotificationPreferencesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useNotificationStore();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences>(preferences);

  useEffect(() => {
    if (open) setLocalPrefs(preferences);
  }, [open, preferences]);

  const handleSave = useCallback(() => {
    updatePreferences(localPrefs);
    onClose();
  }, [localPrefs, updatePreferences, onClose]);

  const allTypes: NotificationType[] = [
    'system', 'update', 'achievement', 'collaboration',
    'reminder', 'tip', 'error', 'success',
  ];

  const toggleType = (type: NotificationType) => {
    setLocalPrefs((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: !prev.types[type] },
    }));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('notification.preferences')}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Global toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('notification.enableNotifications')}
                </label>
                <ToggleSwitch
                  checked={localPrefs.enabled}
                  onChange={(v) => setLocalPrefs((p) => ({ ...p, enabled: v }))}
                />
              </div>

              {/* Per-type toggles */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {t('notification.filterAll')} {t('notification.types.system').toLowerCase()}
                </p>
                <div className="space-y-2">
                  {allTypes.map((type) => (
                    <div key={type} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{TYPE_EMOJI[type]}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t(`notification.types.${type}`)}
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={localPrefs.types[type]}
                        onChange={() => toggleType(type)}
                        disabled={!localPrefs.enabled}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiet hours */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {t('notification.quietHours')}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('notification.quietStart')}
                    </label>
                    <input
                      type="time"
                      value={localPrefs.quietHoursStart || ''}
                      onChange={(e) =>
                        setLocalPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))
                      }
                      disabled={!localPrefs.enabled}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 transition-colors"
                    />
                  </div>
                  <span className="text-gray-400 mt-5">—</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {t('notification.quietEnd')}
                    </label>
                    <input
                      type="time"
                      value={localPrefs.quietHoursEnd || ''}
                      onChange={(e) =>
                        setLocalPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))
                      }
                      disabled={!localPrefs.enabled}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Sound & Desktop */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('notification.soundEnabled')}
                  </label>
                  <ToggleSwitch
                    checked={localPrefs.soundEnabled}
                    onChange={(v) => setLocalPrefs((p) => ({ ...p, soundEnabled: v }))}
                    disabled={!localPrefs.enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('notification.desktopEnabled')}
                  </label>
                  <ToggleSwitch
                    checked={localPrefs.desktopEnabled}
                    onChange={(v) => setLocalPrefs((p) => ({ ...p, desktopEnabled: v }))}
                    disabled={!localPrefs.enabled}
                  />
                </div>
              </div>

              {/* Max per type slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('notification.maxPerType')}
                  </label>
                  <span className="text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                    {localPrefs.maxPerType}
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={localPrefs.maxPerType}
                  onChange={(e) =>
                    setLocalPrefs((p) => ({ ...p, maxPerType: Number(e.target.value) }))
                  }
                  disabled={!localPrefs.enabled}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-600 accent-amber-500 disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg shadow-sm transition-all"
              >
                {t('notification.save')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── ToggleSwitch ───────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        checked
          ? 'bg-gradient-to-r from-amber-500 to-orange-600'
          : 'bg-gray-200 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-4">
        <svg
          className="w-10 h-10 text-amber-400 dark:text-amber-500"
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
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {t('notification.noNotifications')}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        {t('notification.title')}
      </p>
    </div>
  );
}

// ─── NotificationItem ───────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const emoji = notification.icon || TYPE_EMOJI[notification.type];
  const bgClass = TYPE_BG[notification.type];

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    if (notification.action?.url) {
      window.location.href = notification.action.url;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
        notification.read
          ? 'bg-white dark:bg-gray-800/50'
          : 'bg-amber-50/40 dark:bg-amber-900/10'
      } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
      )}

      {/* Type icon */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg ${bgClass}`}
      >
        {emoji}
      </div>

      {/* Content */}
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
          {(notification.priority === 'urgent' || notification.priority === 'high') && (
            <span
              className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                PRIORITY_BADGE[notification.priority]
              }`}
            >
              {t(`notification.priorities.${notification.priority}`)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatRelativeTime(notification.timestamp)}
          </p>
          {notification.action && (
            <span className="text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              {notification.action.label}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="flex-shrink-0 p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
        aria-label={t('notification.delete')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─── TimeGroupHeader ────────────────────────────────────────────────

function TimeGroupHeader({ group }: { group: TimeGroup }) {
  const { t } = useTranslation();
  const labels: Record<TimeGroup, string> = {
    justNow: t('notification.justNow'),
    today: t('notification.today'),
    yesterday: t('notification.yesterday'),
    earlier: t('notification.earlier'),
  };
  return (
    <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {labels[group]}
      </span>
    </div>
  );
}

// ─── NotificationPanel ──────────────────────────────────────────────

function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType>('all');
  const [visibleCount, setVisibleCount] = useState(VISIBLE_COUNT);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
  } = useNotificationStore();

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(VISIBLE_COUNT);
  }, [activeFilter]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function handleClickOutside(e: MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const grouped = useMemo(() => groupByTime(filtered), [filtered]);
  const visibleGroups = useMemo(() => {
    const result: Array<{ group: TimeGroup; items: Notification[] }> = [];
    let count = 0;
    for (const g of grouped) {
      if (count >= visibleCount) break;
      const remaining = visibleCount - count;
      result.push({ group: g.group, items: g.items.slice(0, remaining) });
      count += g.items.length;
    }
    return result;
  }, [grouped, visibleCount]);

  const hasMore = filtered.length > visibleCount;
  const unread = unreadCount();

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 md:hidden bg-black/20"
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 md:absolute md:bottom-auto md:top-full md:mt-2 md:right-0 md:h-[32rem] bg-white dark:bg-gray-800 md:rounded-xl shadow-xl border-l md:border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              role="dialog"
              aria-label={t('notification.title')}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('notification.title')}
                    </h3>
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unread > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                      >
                        {t('notification.markAllRead')}
                      </button>
                    )}
                    <button
                      onClick={() => setPrefsOpen(true)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={t('notification.settings')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        activeFilter === tab.key
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t(tab.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification list */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <EmptyState key="empty" />
                  ) : (
                    visibleGroups.map(({ group, items }) => (
                      <div key={group}>
                        <TimeGroupHeader group={group} />
                        <AnimatePresence mode="popLayout">
                          {items.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification}
                              onRead={markAsRead}
                              onDelete={deleteNotification}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </AnimatePresence>

                {/* Load more */}
                {hasMore && (
                  <div className="px-4 py-3 text-center">
                    <button
                      onClick={() => setVisibleCount((c) => c + VISIBLE_COUNT)}
                      className="px-4 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                    >
                      {t('notification.loadMore')}
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom settings button */}
              <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setPrefsOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  {t('notification.preferences')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preferences modal */}
      <NotificationPreferencesModal open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </>
  );
}

// ─── BellIcon ───────────────────────────────────────────────────────

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

// ─── NotificationBell (exported, used in Header) ────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const prevUnreadRef = useRef(0);
  const { t } = useTranslation();

  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const unread = notifications.filter((n) => !n.read).length;

  // Detect new high/urgent notifications for toast
  useEffect(() => {
    if (prevUnreadRef.current === 0 && unread > 0) {
      // First load, don't show toasts
    } else if (unread > prevUnreadRef.current) {
      const newUnread = notifications.filter((n) => !n.read);
      const prevCount = prevUnreadRef.current;
      const newOnes = newUnread.slice(0, newUnread.length - prevCount);
      const urgentOrHigh = newOnes.filter(
        (n) => n.priority === 'high' || n.priority === 'urgent'
      );
      for (const n of urgentOrHigh) {
        setToastQueue((prev) => [...prev, n]);
      }
    }
    prevUnreadRef.current = unread;
  }, [unread, notifications]);

  const dismissToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={`${t('notification.title')}${unread > 0 ? ` (${unread})` : ''}`}
          aria-expanded={open}
        >
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-full ring-2 ring-white dark:ring-gray-900"
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
          {/* Pulse animation for new notifications */}
          {unread > 0 && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            />
          )}
        </button>
        <NotificationPanel open={open} onClose={() => setOpen(false)} />
      </div>

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[80] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toastQueue.map((notification) => (
            <NotificationToast
              key={notification.id}
              notification={notification}
              onDismiss={(id) => {
                markAsRead(id);
                dismissToast(id);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Convenience Hook ───────────────────────────────────────────────

/**
 * Convenience notification hook providing `notify(title, message, type)` shortcut.
 *
 * @example
 * ```tsx
 * const { notify } = useNotification();
 * notify('Generation Complete', 'Your article has been generated', 'success');
 * ```
 */
export function useNotification() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const notify = useCallback(
    (
      title: string,
      message: string,
      type: NotificationType = 'success',
      priority: Notification['priority'] = 'medium'
    ) => {
      addNotification({ title, message, type, priority });
    },
    [addNotification]
  );

  return { notify };
}
