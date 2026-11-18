import { useEffect, useState } from 'react'
import {
  Calendar, CheckCircle, Lightbulb, ClipboardList, Bot, Users,
  Sparkles, FileText, Award, ArrowRight, Wand2, Loader2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, StatTile, GlassCardHeader } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { groqChat } from '@/lib/groq'

export default function MemberDashboard() {
  const { setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ myEvents: 0, myTasks: 0, completedTasks: 0, ideasSubmitted: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // AI Task Recommendation
  const [aiTip, setAiTip] = useState<string>('')
  const [aiTipLoading, setAiTipLoading] = useState<boolean>(false)

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
        ideasSubmitted: myEvents.length,
      })

      setUpcomingEvents(activeEvents.slice(0, 4))
      setMyTasks(tasks.slice(0, 5))

      // Fetch quick AI advice for member
      generateAiGuidance(tasks, activeEvents)
    } catch (err) {
      console.error('Failed to load member dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateAiGuidance = async (tasksList: any[], activeEventsList: any[]) => {
    setAiTipLoading(true)
    try {
      const prompt = `As the AI Society Coordinator, provide a 1-sentence encouraging action tip for member "${profile?.full_name || 'Member'}".
Active tasks assigned: ${tasksList.length}. Active upcoming events: ${activeEventsList.length}.
Make it direct, professional, and actionable.`

      const tip = await groqChat([
        { role: 'system', content: 'You are an encouraging college society AI leader. Output 1 short actionable sentence only.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 80 })

      setAiTip(tip.trim().replace(/^"/, '').replace(/"$/, ''))
    } catch {
      setAiTip('Explore upcoming events, draft an idea proposal, or generate an official letter with AI!')
    } finally {
      setAiTipLoading(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading dashboard..." />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Member'} 👋
          </h1>
          <p className="text-muted mt-1">Here is what is happening across Technovation Society today</p>
        </div>
        <Link to="/events/new" className="btn-primary">
          <Sparkles className="w-4 h-4" />
          Plan New Event
        </Link>
      </div>

      {/* AI Daily Guidance Pill */}
      <div
        className="rounded-2xl p-4 border flex items-center gap-3.5 transition-all shadow-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.06))',
          borderColor: 'rgba(139,92,246,0.25)',
        }}
      >
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">AI Society Copilot</p>
          <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
            {aiTipLoading ? 'Analyzing today’s society deliverables...' : (aiTip || 'Ready to assist with proposals, ideation, tasks, and document generation.')}
          </p>
        </div>
        <Link to="/assistant" className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap">
          Open AI
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="My Events" value={stats.myEvents} icon={<Calendar className="w-6 h-6" />} color="purple" />
        <StatTile label="Active Tasks" value={stats.myTasks} icon={<ClipboardList className="w-6 h-6" />} color="blue" />
        <StatTile label="Completed Tasks" value={stats.completedTasks} icon={<CheckCircle className="w-6 h-6" />} color="green" />
        <StatTile label="Events in Society" value={upcomingEvents.length} icon={<Lightbulb className="w-6 h-6" />} color="amber" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <GlassCard className="lg:col-span-2">
          <GlassCardHeader
            title="Upcoming Events"
            subtitle="Active events in planning & execution"
            action={<Link to="/events" className="text-sm text-accent-cyan hover:underline">View All</Link>}
          />
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No active events right now</p>
              </div>
            ) : (
              upcomingEvents.map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:bg-white/5"
                  style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                    <p className="text-xs text-muted mt-0.5">{event.departments?.name || 'General Society'}</p>
                  </div>
                  <span className={cn('badge text-xs', getEventStatusColor(event.status))}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </GlassCard>

        {/* My Tasks */}
        <GlassCard>
          <GlassCardHeader
            title="My Tasks"
            subtitle="Assigned execution items"
            action={<Link to="/tasks" className="text-sm text-accent-cyan hover:underline">Board</Link>}
          />
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No tasks pending</p>
              </div>
            ) : (
              myTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No deadline'}
                    </p>
                  </div>
                  <span className={cn('badge text-[10px]',
                    task.status === 'completed' ? 'badge-green' :
                    task.status === 'in_progress' ? 'badge-blue' : 'badge-amber'
                  )}>
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quick AI & Creation Actions */}
      <GlassCard>
        <GlassCardHeader title="AI & Autonomous Tools" subtitle="Every member has full access to AI generation" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            to="/events/new"
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all hover:bg-white/5"
            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>AI Ideation</span>
              <span className="text-[11px] text-muted">Draft new event</span>
            </div>
          </Link>

          <Link
            to="/letters"
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all hover:bg-white/5"
            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>AI Letters</span>
              <span className="text-[11px] text-muted">Generate permissions/NOC</span>
            </div>
          </Link>

          <Link
            to="/certificates"
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all hover:bg-white/5"
            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>Certificates</span>
              <span className="text-[11px] text-muted">Create & print</span>
            </div>
          </Link>

          <Link
            to="/assistant"
            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition-all hover:bg-white/5"
            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
          >
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>AI Assistant</span>
              <span className="text-[11px] text-muted">Natural language queries</span>
            </div>
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}
