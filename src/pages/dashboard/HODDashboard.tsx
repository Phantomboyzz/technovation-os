import { useEffect, useState } from 'react'
import { Plus, Users, Calendar, CheckCircle, AlertTriangle, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useMemberStore } from '@/store/memberStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { memberService } from '@/services/memberService'
import { GlassCard, StatTile, GlassCardHeader } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel, getEventProgress } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function HODDashboard() {
  const { setEvents, setNotifications } = useEventStore()
  const { setMembers, departments } = useMemberStore()
  const { profile } = useAuthStore()
  const myDeptId = departments.find(d => d.hod_id === profile?.id)?.id || null
  const [stats, setStats] = useState({
    myEvents: 0,
    activeEvents: 0,
    pendingApprovals: 0,
    myMembers: 0,
    myTasks: 0,
    overdueTasks: 0,
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [myDeptId])

  const loadData = async () => {
    if (!myDeptId) {
      setLoading(false)
      return
    }
    try {
      const [events, members] = await Promise.all([
        eventService.getEvents(myDeptId),
        memberService.getMembers(myDeptId),
      ])

      setEvents(events)
      setMembers(members)

      const activeEvents = events.filter(e => ['approved', 'tasks_allocated', 'in_progress'].includes(e.status))
      const pendingApprovals = events.filter(e => e.status === 'proposal_submitted')

      setStats({
        myEvents: events.length,
        activeEvents: activeEvents.length,
        pendingApprovals: pendingApprovals.length,
        myMembers: members.length,
        myTasks: 0,
        overdueTasks: 0,
      })

      setRecentEvents(events.slice(0, 5))
    } catch (err) {
      console.error('Failed to load HOD dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading dashboard..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">HOD Dashboard</h1>
          <p className="text-muted mt-1">{departments.find(d => d.id === myDeptId)?.name || 'Department'} overview</p>
        </div>
        <Link to="/events/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Event
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="My Events" value={stats.myEvents} icon={<Calendar className="w-6 h-6" />} color="purple" />
        <StatTile label="Active Events" value={stats.activeEvents} icon={<CheckCircle className="w-6 h-6" />} color="green" />
        <StatTile label="Pending Approvals" value={stats.pendingApprovals} icon={<AlertTriangle className="w-6 h-6" />} color="amber" />
        <StatTile label="Department Members" value={stats.myMembers} icon={<Users className="w-6 h-6" />} color="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <GlassCardHeader title="Quick Actions" />
          <div className="space-y-3">
            <Link to="/events/new" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Create Event</p>
                <p className="text-sm text-muted">Plan a new event</p>
              </div>
            </Link>
            <Link to="/tasks" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Manage Tasks</p>
                <p className="text-sm text-muted">Assign & track tasks</p>
              </div>
            </Link>
            <Link to="/members" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium">View Members</p>
                <p className="text-sm text-muted">{stats.myMembers} members</p>
              </div>
            </Link>
            <Link to="/approvals" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium">Approvals</p>
                <p className="text-sm text-muted">{stats.pendingApprovals} pending</p>
              </div>
            </Link>
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader
            title="My Department Events"
            action={<Link to="/events" className="text-sm text-accent-cyan">View All</Link>}
          />
          <div className="space-y-3">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events yet. Create your first event!</p>
              </div>
            ) : (
              recentEvents.map(event => (
                <Link key={event.id} to={`/events/${event.id}`} className="flex items-center gap-4 p-3 glass rounded-xl hover:bg-white/5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted">{event.status === 'draft' ? 'Draft' : 'Submitted'}</p>
                  </div>
                  <span className={cn('badge', getEventStatusColor(event.status))}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}