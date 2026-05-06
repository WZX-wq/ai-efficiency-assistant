import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'system'
  | 'update'
  | 'achievement'
  | 'collaboration'
  | 'reminder'
  | 'tip'
  | 'error'
  | 'success';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  url: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: NotificationAction;
  icon?: string;
  priority: NotificationPriority;
  expiresAt?: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  maxPerType: number;
}

interface NotificationState {
  notifications: Notification[];
  preferences: NotificationPreferences;

  // Computed
  unreadCount: () => number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  generateMockNotifications: () => void;
}

// ─── Default preferences ────────────────────────────────────────────

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  types: {
    system: true,
    update: true,
    achievement: true,
    collaboration: true,
    reminder: true,
    tip: true,
    error: true,
    success: true,
  },
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  soundEnabled: true,
  desktopEnabled: false,
  maxPerType: 20,
};

// ─── ID counter ─────────────────────────────────────────────────────

let counter = 0;
function nextId(): string {
  return `notif-${Date.now()}-${++counter}`;
}

// ─── Mock data generator ────────────────────────────────────────────

function generateMockData(): Notification[] {
  const now = Date.now();
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  const mocks: Array<Omit<Notification, 'id' | 'timestamp' | 'read'>> = [
    // Just now
    {
      type: 'system',
      title: '系统维护通知',
      message: '平台将于今晚 23:00-01:00 进行系统升级维护，届时部分功能可能暂时不可用，请提前保存您的工作内容。',
      icon: '🔧',
      priority: 'high',
    },
    {
      type: 'achievement',
      title: '恭喜解锁成就！',
      message: '您已累计生成 10,000 字内容，获得「内容达人」成就徽章。继续创作解锁更多成就吧！',
      icon: '🏆',
      priority: 'medium',
    },
    {
      type: 'success',
      title: '文档导出成功',
      message: '您的营销方案文档已成功导出为 PDF 格式，文件大小 2.3MB。',
      icon: '✅',
      priority: 'low',
    },
    // Today
    {
      type: 'update',
      title: '新功能上线：AI 视频脚本生成',
      message: '全新 AI 视频脚本生成功能已上线，支持短视频、中长视频多种格式，快来体验吧！',
      icon: '🚀',
      priority: 'medium',
      action: { label: '立即体验', url: '/workspace/scripts' },
    },
    {
      type: 'collaboration',
      title: '张明邀请您协作',
      message: '张明邀请您加入「Q3 营销方案」文档的协作编辑，点击查看详情并接受邀请。',
      icon: '👥',
      priority: 'medium',
      action: { label: '查看邀请', url: '/workspace' },
    },
    {
      type: 'tip',
      title: '效率小技巧',
      message: '使用 Ctrl+K 快速唤起命令面板，可以快速搜索和切换工具，大幅提升工作效率。',
      icon: '💡',
      priority: 'low',
    },
    {
      type: 'reminder',
      title: '营销排期提醒',
      message: '距离「618 大促」内容发布还有 3 天，请确保相关文案和素材已准备就绪。',
      icon: '⏰',
      priority: 'high',
    },
    {
      type: 'error',
      title: 'API 调用额度不足',
      message: '您的 DeepSeek API 调用额度已用完 90%，建议及时充值或切换到其他模型以避免服务中断。',
      icon: '⚠️',
      priority: 'urgent',
      action: { label: '前往充值', url: '/settings' },
    },
    // Yesterday
    {
      type: 'system',
      title: '安全登录提醒',
      message: '检测到您的账号在新设备上登录，如果这不是您本人的操作，请立即修改密码。',
      icon: '🔒',
      priority: 'high',
    },
    {
      type: 'achievement',
      title: '连续使用 7 天',
      message: '您已连续使用 AI 效率助手 7 天，获得「坚持之星」成就徽章！',
      icon: '⭐',
      priority: 'low',
    },
    {
      type: 'success',
      title: '批量翻译完成',
      message: '您提交的 15 篇产品描述翻译任务已全部完成，支持中、英、日三种语言。',
      icon: '🌍',
      priority: 'medium',
      action: { label: '查看结果', url: '/workspace/history' },
    },
    {
      type: 'update',
      title: '模板库更新',
      message: '新增 8 个行业专属模板，涵盖电商、教育、金融等领域，立即前往模板库查看。',
      icon: '📦',
      priority: 'low',
      action: { label: '浏览模板', url: '/workspace/templates' },
    },
    {
      type: 'collaboration',
      title: '评论回复通知',
      message: '李雪在「品牌声音指南」文档中回复了您的评论："这个建议非常好，我来更新一下。"。',
      icon: '💬',
      priority: 'low',
    },
    // Earlier
    {
      type: 'tip',
      title: 'SEO 优化建议',
      message: '您最近发布的文章标题长度偏长，建议控制在 30 字以内以获得更好的搜索引擎排名。',
      icon: '📈',
      priority: 'low',
    },
    {
      type: 'reminder',
      title: '周报提交提醒',
      message: '本周工作周报截止时间为周五 18:00，请及时整理并提交。',
      icon: '📋',
      priority: 'medium',
    },
    {
      type: 'system',
      title: '存储空间提醒',
      message: '您的本地存储空间已使用 75%，建议清理不需要的历史记录和草稿文件。',
      icon: '💾',
      priority: 'medium',
      action: { label: '管理存储', url: '/settings' },
    },
    {
      type: 'success',
      title: '品牌声音创建成功',
      message: '您的品牌声音配置「科技简约风」已保存成功，后续生成内容将自动应用此风格。',
      icon: '🎨',
      priority: 'low',
    },
    {
      type: 'achievement',
      title: '工具大师',
      message: '您已使用过全部 28 个 AI 工具，获得「工具大师」成就徽章！',
      icon: '🏅',
      priority: 'medium',
    },
  ];

  return mocks.map((m, i) => ({
    ...m,
    id: nextId(),
    timestamp:
      i < 3
        ? now - Math.floor(Math.random() * 5 * minute)
        : i < 8
          ? now - Math.floor(Math.random() * 12 * hour)
          : i < 13
            ? now - day - Math.floor(Math.random() * 12 * hour)
            : now - 2 * day - Math.floor(Math.random() * 3 * day),
    read: i >= 3,
  }));
}

// ─── Store ──────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      preferences: { ...defaultPreferences },

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      addNotification: (notification) =>
        set((state) => {
          const type = notification.type;
          const max = state.preferences.maxPerType;
          const filtered = state.notifications.filter(
            (n) => n.type !== type
          );
          const sameType = state.notifications.filter(
            (n) => n.type === type
          );
          const trimmed =
            sameType.length >= max
              ? sameType.slice(0, max - 1)
              : sameType;

          return {
            notifications: [
              {
                ...notification,
                id: nextId(),
                timestamp: Date.now(),
                read: false,
              },
              ...trimmed,
              ...filtered,
            ],
          };
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            read: true,
          })),
        })),

      deleteNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      generateMockNotifications: () =>
        set({ notifications: generateMockData() }),
    }),
    {
      name: 'ai-assistant-notifications-v2',
      partialize: (state) => ({
        notifications: state.notifications,
        preferences: state.preferences,
      }),
    }
  )
);
