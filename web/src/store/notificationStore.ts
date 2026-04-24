import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 通知类型 */
export interface Notification {
  id: string;
  type: 'system' | 'success' | 'error' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: number; // 时间戳
}

/** 通知 Store 接口 */
interface NotificationState {
  notifications: Notification[];

  /** 添加通知 */
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  /** 标记单条已读 */
  markAsRead: (id: string) => void;
  /** 全部标记已读 */
  markAllAsRead: () => void;
  /** 删除单条通知 */
  removeNotification: (id: string) => void;
  /** 清空所有通知 */
  clearAll: () => void;
  /** 未读数量 */
  unreadCount: () => number;
}

let counter = 0;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif-${Date.now()}-${++counter}`,
              read: false,
              createdAt: Date.now(),
            },
            ...state.notifications,
          ],
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'ai-assistant-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    }
  )
);
