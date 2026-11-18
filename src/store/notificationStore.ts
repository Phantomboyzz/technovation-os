import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification } from '@/types/schema'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Notification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  setNotifications: (list: Notification[]) => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (n) =>
        set((s) => ({
          notifications: [n, ...s.notifications],
          unreadCount: s.unreadCount + (n.read ? 0 : 1),
        })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, s.unreadCount - 1),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({
            ...n,
            read: true,
            read_at: n.read_at || new Date().toISOString(),
          })),
          unreadCount: 0,
        })),
      setNotifications: (list) =>
        set({ notifications: list, unreadCount: list.filter((n) => !n.read).length }),
      reset: () => set({ notifications: [], unreadCount: 0 }),
    }),
    { name: 'notification-storage' }
  )
)