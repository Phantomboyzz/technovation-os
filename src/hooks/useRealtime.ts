import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useEventStore } from '@/store/eventStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useMemberStore } from '@/store/memberStore'
import type { Notification } from '@/types/schema'

export function useRealtime() {
  const { setEvents, setIdeas, setProposals, setTasks, addNotification } = useEventStore()
  const { addNotification: addNotif } = useNotificationStore()
  const { setMembers, setDepartments } = useMemberStore()

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = []

    // Events channel
    const eventsCh = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        console.log('Realtime: events change', payload)
        // Refetch handled by component
      })
      .subscribe()
    channels.push(eventsCh)

    // Tasks channel
    const tasksCh = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime: tasks change', payload)
      })
      .subscribe()
    channels.push(tasksCh)

    // Notifications channel
    const notifCh = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const notif = payload.new as Notification
        addNotification(notif)
        addNotif(notif)
      })
      .subscribe()
    channels.push(notifCh)

    // Proposals channel
    const propCh = supabase
      .channel('proposals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, (payload) => {
        console.log('Realtime: proposals change', payload)
      })
      .subscribe()
    channels.push(propCh)

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [addNotification, addNotif])
}