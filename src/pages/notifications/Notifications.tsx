import { useEffect, useState } from 'react'
import { Bell, Check, X, Filter, Mail, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { notificationService } from '@/services/notificationService'
import { GlassCard } from '@/components/common'
import { cn, timeAgo } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function Notifications() {
  const { profile } = useAuthStore()
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [loading, setLoading] = useState(true)

  const handleFilterChange = (value: 'all' | 'unread' | 'read') => {
    setFilter(value)
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(profile?.id || '')
      // The store will be updated via realtime, but we can seed it
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  if (loading) return <LoadingSpinner size="lg" message="Loading notifications..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Notifications</h1>
          <p className="text-muted mt-1">Stay updated with society activities</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('badge', unreadCount > 0 ? 'badge-amber' : 'badge-green')}>
            {unreadCount} unread
          </span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm">
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <GlassCard padding="sm">
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-accent-purple/30 text-white'
                  : 'text-muted hover:bg-white/5'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <GlassCard className="text-center py-16">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-muted">You're all caught up!</p>
          </GlassCard>
        ) : (
          filteredNotifications.map(n => (
            <GlassCard
              key={n.id}
              className={cn('flex items-start gap-4', !n.read && 'bg-white/5 border-accent-purple/20')}
              hover
              onClick={() => !n.read && markRead(n.id)}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                n.type === 'approval' && 'bg-amber-500/20',
                n.type === 'task' && 'bg-blue-500/20',
                n.type === 'automation' && 'bg-purple-500/20',
                n.type === 'event' && 'bg-green-500/20',
                n.type === 'system' && 'bg-slate-500/20',
              )}>
                {n.type === 'approval' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {n.type === 'task' && <CheckCircle className="w-5 h-5 text-blue-400" />}
                {n.type === 'automation' && <Clock className="w-5 h-5 text-purple-400" />}
                {n.type === 'event' && <Bell className="w-5 h-5 text-green-400" />}
                {n.type === 'system' && <Mail className="w-5 h-5 text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium">{n.title}</h4>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-accent-purple flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-muted mt-1">{n.message}</p>
                <p className="text-xs text-dim mt-2">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && (
                <button
                  onClick={e => { e.stopPropagation(); markRead(n.id) }}
                  className="p-2 glass rounded-xl hover:bg-white/5 text-muted hover:text-green-400"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </GlassCard>
          ))
        )}
      </div>
    </div>
  )
}

