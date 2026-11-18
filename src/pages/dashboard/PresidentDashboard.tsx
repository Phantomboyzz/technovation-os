import { useEffect, useState } from 'react'
import { Plus, TrendingUp, Users, Clock, Zap, Calendar, CheckCircle, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useMemberStore } from '@/store/memberStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { memberService } from '@/services/memberService'
import { notificationService } from '@/services/notificationService'
import { GlassCard, StatTile, GlassCardHeader } from '@/components/common'
import { cn, formatCurrency, getEventStatusColor, getEventStatusLabel, getEventProgress } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function PresidentDashboard() {
  const { setEvents, setNotifications } = useEventStore()
  const { setDepartments, setMembers } = useMemberStore()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    pendingApprovals: 0,
    totalMembers: 0,
    completedTasks: 0,
    overdueTasks: 0,
    automationRules: 0,
    unreadNotifications: 0,
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [events, departments, members, notifications] = await Promise.all([
        eventService.getEvents(),
        memberService.getDepartments(),
        memberService.getMembers(),
        notificationService.getNotifications(profile?.id || ''),
      ])

      setEvents(events)
      setDepartments(departments)
      setMembers(members)
      setNotifications(notifications)

      const activeEvents = events.filter(e => ['approved', 'tasks_allocated', 'in_progress'].includes(e.status))
      const pendingApprovals = events.filter(e => e.status === 'proposal_submitted')

      setStats({
        totalEvents: events.length,
        activeEvents: activeEvents.length,
        pendingApprovals: pendingApprovals.length,
        totalMembers: members.length,
        completedTasks: 0,
        overdueTasks: 0,
        automationRules: 0,
        unreadNotifications: notifications.filter(n => !n.read).length,
      })

      setRecentEvents(events.slice(0, 5))
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading dashboard..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">President Dashboard</h1>
          <p className="text-muted mt-1">Society overview & key metrics</p>
        </div>
        <Link to="/events/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Event
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total Events"
          value={stats.totalEvents}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatTile
          label="Active Events"
          value={stats.activeEvents}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
          trend={{ value: 8, label: 'in progress' }}
        />
        <StatTile
          label="Pending Approvals"
          value={stats.pendingApprovals}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="amber"
        />
        <StatTile
          label="Total Members"
          value={stats.totalMembers}
          icon={<Users className="w-6 h-6" />}
          color="cyan"
          trend={{ value: 5, label: 'new this week' }}
        />
      </div>

      {/* Quick Actions & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <GlassCard className="lg:col-span-1">
          <GlassCardHeader title="Quick Actions" subtitle="Common administrative tasks" />
          <div className="space-y-3">
            <Link to="/events/new" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Create Event</p>
                <p className="text-sm text-muted">Start a new event</p>
              </div>
            </Link>
            <Link to="/approvals" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium">Review Proposals</p>
                <p className="text-sm text-muted">{stats.pendingApprovals} pending</p>
              </div>
            </Link>
            <Link to="/automation" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-medium">Automation Rules</p>
                <p className="text-sm text-muted">Manage workflows</p>
              </div>
            </Link>
            <Link to="/members" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium">Manage Members</p>
                <p className="text-sm text-muted">{stats.totalMembers} active</p>
              </div>
            </Link>
            <Link to="/settings/society" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="font-medium">Society Settings</p>
                <p className="text-sm text-muted">Configure society</p>
              </div>
            </Link>
          </div>
        </GlassCard>

        {/* Recent Events */}
        <GlassCard className="lg:col-span-2">
          <GlassCardHeader
            title="Recent Events"
            subtitle="Latest events across all departments"
            action={<Link to="/events" className="text-sm text-accent-cyan hover:underline">View All</Link>}
          />
          <div className="space-y-3">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events yet. Create your first event!</p>
              </div>
            ) : (
              recentEvents.map(event => (
                <Link key={event.id} to={`/events/${event.id}`} className="flex items-center gap-4 p-3 glass rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted">{event.departments?.name || 'No department'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('badge', getEventStatusColor(event.status))}>
                      {getEventStatusLabel(event.status)}
                    </span>
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-purple to-accent-cyan rounded-full transition-all duration-500"
                        style={{ width: `${getEventProgress(event.status)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* System Health */}
      <GlassCard>
        <GlassCardHeader title="System Health" subtitle="Automation & notifications status" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="font-medium">Automation Engine</p>
            <p className="text-sm text-green-400">Active</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="font-medium">Scheduled Jobs</p>
            <p className="text-sm text-blue-400">Running</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
            <p className="font-medium">Notifications</p>
            <p className="text-sm text-cyan-400">{stats.unreadNotifications} unread</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="font-medium">Pending Actions</p>
            <p className="text-sm text-amber-400">{stats.pendingApprovals} approvals</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

