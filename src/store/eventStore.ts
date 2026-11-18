import { create } from 'zustand'
import type { Event, EventIdea, Proposal, Task, AutomationRule, AutomationLog, Notification } from '@/types/schema'

interface EventState {
  events: Event[]
  ideas: EventIdea[]
  proposals: Proposal[]
  tasks: Task[]
  automationRules: AutomationRule[]
  automationLogs: AutomationLog[]
  notifications: Notification[]
  unreadCount: number
  setEvents: (events: Event[]) => void
  setIdeas: (ideas: EventIdea[]) => void
  setProposals: (proposals: Proposal[]) => void
  setTasks: (tasks: Task[]) => void
  setAutomationRules: (rules: AutomationRule[]) => void
  setAutomationLogs: (logs: AutomationLog[]) => void
  setNotifications: (notifications: Notification[]) => void
  addNotification: (n: Notification) => void
  markNotificationRead: (id: string) => void
  updateEventStatus: (id: string, status: string) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  addAutomationLog: (log: AutomationLog) => void
  reset: () => void
}

export const useEventStore = create<EventState>()((set) => ({
  events: [],
  ideas: [],
  proposals: [],
  tasks: [],
  automationRules: [],
  automationLogs: [],
  notifications: [],
  unreadCount: 0,
  setEvents: (events) => set({ events }),
  setIdeas: (ideas) => set({ ideas }),
  setProposals: (proposals) => set({ proposals }),
  setTasks: (tasks) => set({ tasks }),
  setAutomationRules: (rules) => set({ automationRules: rules }),
  setAutomationLogs: (logs) => set({ automationLogs: logs }),
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length }),
  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + (n.read ? 0 : 1),
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  updateEventStatus: (id, status) =>
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, status: status as any } : e)),
    })),
  addTask: (task) =>
    set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  addAutomationLog: (log) =>
    set((s) => ({ automationLogs: [log, ...s.automationLogs] })),
  reset: () =>
    set({
      events: [],
      ideas: [],
      proposals: [],
      tasks: [],
      automationRules: [],
      automationLogs: [],
      notifications: [],
      unreadCount: 0,
    }),
}))