import { useEffect, useState } from 'react'
import { ClipboardList, CheckCircle, AlertTriangle, Calendar, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, StatTile, GlassCardHeader } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function FacultyDashboard() {
  const { setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ pendingApprovals: 0, totalEvents: 0, activeEvents: 0 })
  const [pendingProposals, setPendingProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const events = await eventService.getEvents()
      setEvents(events)

      // Get proposals needing approval
      const proposals = await eventService.getProposals()

      const pending = proposals.filter(p => p.status === 'pending')
      const activeEvents = events.filter(e => ['approved', 'tasks_allocated', 'in_progress'].includes(e.status))

      setStats({
        pendingApprovals: pending.length,
        totalEvents: events.length,
        activeEvents: activeEvents.length,
      })
      setPendingProposals(pending.slice(0, 5))
    } catch (err) {
      console.error('Failed to load faculty dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading dashboard..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Faculty Dashboard</h1>
        <p className="text-muted mt-1">Review proposals & oversee events</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Pending Approvals" value={stats.pendingApprovals} icon={<AlertTriangle className="w-6 h-6" />} color="amber" />
        <StatTile label="Total Events" value={stats.totalEvents} icon={<Calendar className="w-6 h-6" />} color="purple" />
        <StatTile label="Active Events" value={stats.activeEvents} icon={<CheckCircle className="w-6 h-6" />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <GlassCardHeader title="Pending Approvals" action={<Link to="/approvals" className="text-sm text-accent-cyan">View All</Link>} />
          <div className="space-y-3">
            {pendingProposals.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending approvals</p>
              </div>
            ) : (
              pendingProposals.map(proposal => (
                <Link key={proposal.id} to={`/approvals/${proposal.id}`} className="flex items-center gap-4 p-3 glass rounded-xl hover:bg-white/5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{proposal.title}</p>
                    <p className="text-sm text-muted">Submitted {new Date(proposal.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <span className="badge-amber">Pending</span>
                </Link>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader title="Quick Actions" />
          <div className="space-y-3">
            <Link to="/approvals" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium">Review Proposals</p>
                <p className="text-sm text-muted">{stats.pendingApprovals} awaiting review</p>
              </div>
            </Link>
            <Link to="/events" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">All Events</p>
                <p className="text-sm text-muted">{stats.totalEvents} total events</p>
              </div>
            </Link>
            <Link to="/tasks" className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Task Oversight</p>
                <p className="text-sm text-muted">Monitor progress</p>
              </div>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}