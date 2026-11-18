import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, Lightbulb, ClipboardList, Bot, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, StatTile, GlassCardHeader } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function MemberDashboard() {
  const { setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ myEvents: 0, myTasks: 0, completedTasks: 0, ideasSubmitted: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const events = await eventService.getEvents()
      setEvents(events)

      const myEvents = events.filter(e => e.created_by === profile?.id)
      const activeEvents = events.filter(e => ['approved', 'tasks_allocated', 'in_progress'].includes(e.status))

      // Get tasks assigned to me
      const tasks = await eventService.getTasks(undefined, profile?.id)

      setStats({
        myEvents: myEvents.length,
        myTasks: tasks.filter((t: any) => t.status !== 'completed').length,
        completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
        ideasSubmitted: 0,
      })

      setUpcomingEvents(activeEvents.slice(0, 3))
      setMyTasks(tasks.slice(0, 5))
    } catch (err) {
      console.error('Failed to load member dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading dashboard..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">My Dashboard</h1>
        <p className="text-muted mt-1">Your events, tasks & ideas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="My Events" value={stats.myEvents} icon={<Calendar className="w-6 h-6" />} color="purple" />
        <StatTile label="Active Tasks" value={stats.myTasks} icon={<ClipboardList className="w-6 h-6" />} color="blue" />
        <StatTile label="Completed" value={stats.completedTasks} icon={<CheckCircle className="w-6 h-6" />} color="green" />
        <StatTile label="Ideas Submitted" value={stats.ideasSubmitted} icon={<Lightbulb className="w-6 h-6" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <GlassCardHeader title="Upcoming Events" action={<Link to="/events" className="text-sm text-accent-cyan">View All</Link>} />
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
              </div>
            ) : (
              upcomingEvents.map(event => (
                <Link key={event.id} to={`/events/${event.id}`} className="flex items-center gap-4 p-3 glass rounded-xl hover:bg-white/5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-muted">{event.departments?.name || 'No department'}</p>
                  </div>
                  <span className={cn('badge', getEventStatusColor(event.status))}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader title="My Tasks" action={<Link to="/tasks" className="text-sm text-accent-cyan">View All</Link>} />
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tasks assigned</p>
              </div>
            ) : (
              myTasks.map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className="text-xs text-muted">{task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}</p>
                  </div>
                  <span className={cn('badge', task.status === 'completed' ? 'badge-green' : task.status === 'in_progress' ? 'badge-blue' : 'badge-amber')}>
                    {task.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <GlassCardHeader title="Quick Actions" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/events/new" className="flex flex-col items-center gap-2 p-4 glass rounded-xl hover:bg-white/5 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-sm font-medium">Submit Idea</span>
          </Link>
          <Link to="/events" className="flex flex-col items-center gap-2 p-4 glass rounded-xl hover:bg-white/5 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm font-medium">Browse Events</span>
          </Link>
          <Link to="/assistant" className="flex flex-col items-center gap-2 p-4 glass rounded-xl hover:bg-white/5 text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-sm font-medium">AI Assistant</span>
          </Link>
          <Link to="/members" className="flex flex-col items-center gap-2 p-4 glass rounded-xl hover:bg-white/5 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm font-medium">Members</span>
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}