import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Edit, Trash2, Plus, Sparkles, FileText, CheckCircle, Users, Clock, MapPin, DollarSign, ArrowRight, ChevronRight } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader, StatTile } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel, getEventProgress, formatDate, formatCurrency } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const { events, setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [event, setEvent] = useState<any>(null)
  const [ideas, setIdeas] = useState<any[]>([])
  const [proposal, setProposal] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'ideas' | 'proposal' | 'tasks'>('overview')

  useEffect(() => {
    if (id) loadEvent()
  }, [id])

  const loadEvent = async () => {
    try {
      const data = await eventService.getEvent(id!)
      setEvent(data)
      if (data) {
        const [ideasData, proposalData, tasksData] = await Promise.all([
          eventService.getEventIdeas(data.id),
          eventService.getProposals(data.id).catch(() => []),
          eventService.getTasks(data.id).catch(() => []),
        ])
        setIdeas(ideasData)
        setProposal(proposalData?.[0] || null)
        setTasks(tasksData || [])
      }
    } catch (err) {
      console.error('Failed to load event:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!event) return
    try {
      await eventService.updateEvent(event.id, { status: newStatus as any })
      setEvent((prev: any) => ({ ...prev, status: newStatus as any }))
      setEvents(events.map(e => e.id === event.id ? { ...e, status: newStatus as any } : e))
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleGenerateIdeas = async () => {
    if (!event) return
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ideate-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ eventId: event.id, department: event.department_id, theme: event.description }),
      })
      const data = await res.json()
      if (data.ideas) {
        setIdeas([...ideas, ...data.ideas])
        await eventService.updateEvent(event.id, { status: 'ideas_collecting' })
        handleStatusChange('ideas_collecting')
      }
    } catch (err) {
      console.error('Failed to generate ideas:', err)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading event..." />
  if (!event) return <div className="glass-card text-center py-16">Event not found</div>

  const canEdit = can(profile, 'events', 'update') && (event.created_by === profile?.id || can(profile, 'events', 'delete'))
  const canManageIdeas = can(profile, 'events', 'create')
  const canViewProposal = can(profile, 'proposals', 'read')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/events" className="p-2 glass rounded-xl hover:bg-white/5">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={cn('badge', getEventStatusColor(event.status))}>
                {getEventStatusLabel(event.status)}
              </span>
              {event.departments?.name && (
                <span className="badge-blue">{event.departments.name}</span>
              )}
            </div>
            <h1 className="text-3xl font-display font-bold">{event.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <select
              value={event.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="input w-auto"
            >
              <option value="draft">Draft</option>
              <option value="ideas_collecting">Ideation</option>
              <option value="proposal_submitted">Proposal Submitted</option>
              <option value="approved">Approved</option>
              <option value="tasks_allocated">Tasks Allocated</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <GlassCard padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted">Progress</span>
          <span className="font-semibold">{getEventProgress(event.status)}%</span>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-purple to-accent-cyan rounded-full transition-all duration-500"
            style={{ width: `${getEventProgress(event.status)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted mt-2">
          {['Draft', 'Ideation', 'Proposal', 'Approved', 'Tasks', 'Progress', 'Done'].map((stage, i) => (
            <span key={stage} className={i <= ['draft', 'ideas_collecting', 'proposal_submitted', 'approved', 'tasks_allocated', 'in_progress', 'completed'].indexOf(event.status) ? 'text-accent-cyan' : ''}>
              {stage}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Ideas" value={ideas.length} icon={<Sparkles className="w-6 h-6" />} color="purple" />
        <StatTile label="Tasks" value={tasks.length} icon={<CheckCircle className="w-6 h-6" />} color="blue" />
        <StatTile label="Budget" value={formatCurrency(event.budget)} icon={<DollarSign className="w-6 h-6" />} color="green" />
        <StatTile label="Date" value={event.event_date ? formatDate(event.event_date) : 'TBD'} icon={<Clock className="w-6 h-6" />} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'ideas', label: 'Ideas', icon: Sparkles, count: ideas.length },
          { id: 'proposal', label: 'Proposal', icon: FileText, disabled: !proposal && event.status !== 'proposal_submitted' },
          { id: 'tasks', label: 'Tasks', icon: CheckCircle, count: tasks.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            disabled={tab.disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-accent-purple text-foreground'
                : 'border-transparent text-muted hover:text-foreground hover:border-white/10',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-white/10 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <GlassCard>
            <GlassCardHeader title="Overview" />
            <div className="space-y-4">
              {event.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted">{event.description}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.venue && (
                  <div className="flex items-center gap-3 p-3 glass rounded-xl">
                    <MapPin className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Venue</p>
                      <p>{event.venue}</p>
                    </div>
                  </div>
                )}
                {event.budget && (
                  <div className="flex items-center gap-3 p-3 glass rounded-xl">
                    <DollarSign className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Budget</p>
                      <p>{formatCurrency(event.budget)}</p>
                    </div>
                  </div>
                )}
                {event.event_date && (
                  <div className="flex items-center gap-3 p-3 glass rounded-xl">
                    <Clock className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Event Date</p>
                      <p>{formatDate(event.event_date)}</p>
                    </div>
                  </div>
                )}
                {event.created_by && (
                  <div className="flex items-center gap-3 p-3 glass rounded-xl">
                    <Users className="w-5 h-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Created By</p>
                      <p>{event.profiles?.full_name || 'Unknown'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        {activeTab === 'ideas' && (
          <>
            {canManageIdeas && event.status === 'draft' && (
              <GlassCard padding="sm" className="text-center">
                <p className="text-muted mb-4">Generate AI-powered event ideas to kickstart ideation</p>
                <button
                  onClick={handleGenerateIdeas}
                  className="btn-primary"
                  disabled={ideas.length > 0}
                >
                  <Sparkles className="w-4 h-4" />
                  {ideas.length > 0 ? 'Ideas Generated' : 'Generate Ideas with AI'}
                </button>
              </GlassCard>
            )}
            <GlassCard>
              <GlassCardHeader
                title="Event Ideas"
                subtitle={`${ideas.length} ideas submitted`}
              />
              <div className="space-y-3">
                {ideas.length === 0 ? (
                  <div className="text-center py-8 text-muted">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No ideas yet. {event.status === 'draft' ? 'Generate ideas with AI to start!' : 'Ideas will appear here.'}</p>
                  </div>
                ) : (
                  ideas.map(idea => (
                    <div key={idea.id} className="glass p-4 rounded-xl flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{idea.title}</h4>
                          {idea.ai_generated && <span className="badge-purple text-xs">AI</span>}
                        </div>
                        <p className="text-sm text-muted mb-2">{idea.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span>{idea.category}</span>
                          <span>↑ {idea.upvotes} votes</span>
                          <span>By {idea.profiles?.full_name || 'Anonymous'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </>
        )}

        {activeTab === 'proposal' && (
          <GlassCard>
            <GlassCardHeader
              title="Proposal"
              action={proposal ? (
                <Link to={`/events/${event.id}/proposal`} className="btn-secondary text-sm">Edit</Link>
              ) : can(profile, 'proposals', 'create') && event.status === 'ideas_collecting' ? (
                <Link to={`/events/${event.id}/proposal`} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Create Proposal
                </Link>
              ) : null}
            />
            {proposal ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 glass rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">{proposal.title}</p>
                    <p className="text-sm text-muted">
                      Status: <span className="capitalize">{proposal.status}</span>
                    </p>
                  </div>
                  <span className={cn('badge ml-auto', proposal.status === 'approved' ? 'badge-green' : proposal.status === 'rejected' ? 'badge-rose' : 'badge-amber')}>
                    {proposal.status}
                  </span>
                </div>
                {proposal.objectives && (
                  <div>
                    <h4 className="font-medium mb-2">Objectives</h4>
                    <p className="text-muted whitespace-pre-line">{proposal.objectives}</p>
                  </div>
                )}
                {proposal.timeline && (
                  <div>
                    <h4 className="font-medium mb-2">Timeline</h4>
                    <p className="text-muted">{proposal.timeline}</p>
                  </div>
                )}
                {proposal.budget_estimate && (
                  <div>
                    <h4 className="font-medium mb-2">Budget Estimate</h4>
                    <p className="text-muted">{formatCurrency(proposal.budget_estimate)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No proposal submitted yet</p>
                {can(profile, 'proposals', 'create') && event.status === 'ideas_collecting' && (
                  <Link to={`/events/${event.id}/proposal`} className="btn-primary mt-4 inline-flex">
                    <Plus className="w-4 h-4" /> Create Proposal
                  </Link>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {activeTab === 'tasks' && (
          <GlassCard>
            <GlassCardHeader
              title="Tasks"
              subtitle={`${tasks.length} tasks`}
              action={can(profile, 'tasks', 'create') && (
                <Link to={`/events/${event.id}/tasks/new`} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add Task
                </Link>
              )}
            />
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tasks created yet</p>
                </div>
              ) : (
                tasks.map(task => (
                  <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-4 p-3 glass rounded-xl hover:bg-white/5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-muted">{task.departments?.name || 'No department'}</p>
                    </div>
                    <span className={cn('badge', task.status === 'completed' ? 'badge-green' : task.status === 'in_progress' ? 'badge-blue' : 'badge-amber')}>
                      {task.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}