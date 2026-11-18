import { useEffect, useState } from 'react'
import {
  Plus, Search, Calendar, Sparkles, Loader2, ArrowRight, CheckCircle2,
  Send, Users, Award, ShieldCheck, Flame
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { memberService } from '@/services/memberService'
import { notificationService } from '@/services/notificationService'
import { GlassCard } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel, getEventProgress, formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can, isPresident } from '@/lib/permissions'
import { groqChat } from '@/lib/groq'
import { supabase } from '@/lib/supabase'

export default function EventsList() {
  const { events, setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])

  // AI Instant Event Idea & Approval Modal
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiTheme, setAiTheme] = useState('')
  const [aiTargetDept, setAiTargetDept] = useState('')
  const [generatedIdeas, setGeneratedIdeas] = useState<any[]>([])
  const [submittingIdea, setSubmittingIdea] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      const data = await memberService.getDepartments()
      setDepartments(data)
      if (data.length > 0 && !aiTargetDept) setAiTargetDept(data[0].id)
    } catch (e) {
      console.error(e)
    }
  }

  const loadEvents = async () => {
    try {
      const data = await eventService.getEvents()
      setEvents(data)
      setFilteredEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = events
    if (search) {
      result = result.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter)
    }
    if (deptFilter !== 'all') {
      result = result.filter(e => e.department_id === deptFilter)
    }
    setFilteredEvents(result)
  }, [events, search, statusFilter, deptFilter])

  const canCreate = can(profile, 'events', 'create')

  // Generate Ideas directly using AI
  const handleGenerateAiIdeas = async () => {
    if (!aiTheme.trim()) return
    setAiGenerating(true)
    try {
      const targetDeptObj = departments.find(d => d.id === aiTargetDept)
      const deptName = targetDeptObj?.name || 'Technical'

      const prompt = `You are the AI Society Director for a collegiate technical and cultural society.
Topic/Keyword: "${aiTheme}"
Department: "${deptName}"

Generate 3 high-impact, realistic college event ideas that students will love.
Return a strict JSON object with an array named "ideas":
{
  "ideas": [
    {
      "title": "Creative Event Title",
      "tagline": "1 catchy punchline",
      "description": "2-3 comprehensive sentences explaining format, engagement, and takeaways.",
      "estimated_budget": 12000,
      "format": "Hackathon / Competition / Workshop / Exhibition"
    }
  ]
}`

      const res = await groqChat([
        { role: 'system', content: 'You are an elite university activities architect. Return strictly valid JSON.' },
        { role: 'user', content: prompt }
      ], { json: true, maxTokens: 900 })

      const parsed = JSON.parse(res)
      setGeneratedIdeas(parsed.ideas || [])
    } catch (err) {
      console.error('AI Ideas error:', err)
      alert('Could not generate ideas. Check Groq API Key.')
    } finally {
      setAiGenerating(false)
    }
  }

  // Create event from idea and directly submit proposal to President for approval
  const handleLaunchAndRequestApproval = async (idea: any) => {
    setSubmittingIdea(idea.title)
    try {
      // 1. Create the event
      const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const newEvent = await eventService.createEvent({
        title: idea.title,
        description: idea.description,
        department_id: aiTargetDept || (departments[0]?.id || null),
        event_date: eventDate,
        venue: 'Main Campus Auditorium / Hall A',
        budget: idea.estimated_budget || 10000,
        created_by: profile?.id,
        status: 'proposal_submitted',
      })

      // 2. Insert event idea record
      await eventService.createIdea({
        event_id: newEvent.id,
        title: idea.title,
        description: idea.description,
        category: idea.format || 'Competition',
        ai_generated: true,
        created_by: profile?.id,
      })

      // 3. Create a formal pending proposal for President approval
      await eventService.createProposal({
        event_id: newEvent.id,
        title: `Proposal: ${idea.title}`,
        objectives: idea.description,
        budget_estimate: idea.estimated_budget || 10000,
        timeline: '2 weeks preparation, 1 day event execution',
        submitted_by: profile?.id,
        status: 'pending',
      })

      // 4. Send notification to ALL members about the new event idea
      const { data: allProfiles } = await supabase.from('profiles').select('id')
      if (allProfiles && allProfiles.length > 0) {
        const notifs = allProfiles.map(p => ({
          user_id: p.id,
          title: '💡 New AI Event Idea Launched!',
          message: `"${idea.title}" was generated by ${profile?.full_name || 'a member'} and submitted for President approval!`,
          type: 'event',
          entity_type: 'events',
          entity_id: newEvent.id,
        }))
        await supabase.from('notifications').insert(notifs)
      }

      await loadEvents()
      setShowAiModal(false)
      setGeneratedIdeas([])
      setAiTheme('')
      alert(`Success! "${idea.title}" created and sent to the President for approval. Everyone has been notified!`)
      navigate(`/events/${newEvent.id}`)
    } catch (err) {
      console.error('Error submitting event proposal:', err)
      alert('Could not submit event proposal.')
    } finally {
      setSubmittingIdea(null)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading events..." />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Society Events</h1>
          <p className="page-subtitle">Browse, ideate with AI, and track event approvals</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAiModal(true)}
            className="btn-primary bg-gradient-to-r from-accent-purple to-accent-cyan shadow-glow"
          >
            <Sparkles className="w-4 h-4" />
            Generate Ideas with AI
          </button>
          {canCreate && (
            <Link to="/events/new" className="btn-secondary">
              <Plus className="w-4 h-4" />
              Manual Event
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <GlassCard padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search events by title or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-12"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input w-auto text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="ideas_collecting">Ideation</option>
              <option value="proposal_submitted">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="tasks_allocated">Tasks Allocated</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="input w-auto text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full glass-card text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-muted mb-4">{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Use AI Ideation to generate fresh concepts instantly'}</p>
            <button onClick={() => setShowAiModal(true)} className="btn-primary inline-flex">
              <Sparkles className="w-4 h-4" />
              Generate Ideas with AI
            </button>
          </div>
        ) : (
          filteredEvents.map(event => (
            <Link key={event.id} to={`/events/${event.id}`} className="glass-card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center shadow-sm">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <span className={cn('badge text-xs', getEventStatusColor(event.status))}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 truncate" style={{ color: 'var(--text-primary)' }}>
                  {event.title}
                </h3>
                <p className="text-sm text-muted mb-4 line-clamp-2">{event.description || 'No description provided'}</p>

                <div className="space-y-2 text-xs">
                  {event.departments?.name && (
                    <div className="flex items-center gap-2 text-muted">
                      <span>🏢</span>
                      <span className="font-medium text-foreground">{event.departments.name}</span>
                    </div>
                  )}
                  {event.event_date && (
                    <div className="flex items-center gap-2 text-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                  )}
                  {event.venue && (
                    <div className="flex items-center gap-2 text-muted">
                      <span>📍</span>
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                  <span>Lifecycle Progress</span>
                  <span>{getEventProgress(event.status)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
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

      {/* AI Generate Ideas & Submit Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl border shadow-glass max-h-[90vh] overflow-y-auto" style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                    AI Event Idea Generator & Launch
                  </h2>
                  <p className="text-xs text-muted">Generate concepts and send directly to the President for approval</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-muted">✕</button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Department</label>
                  <select
                    value={aiTargetDept}
                    onChange={e => setAiTargetDept(e.target.value)}
                    className="input text-sm"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Focus Theme / Topic *</label>
                  <input
                    type="text"
                    placeholder="e.g. Generative AI, Robotics Derby, Film Fest"
                    value={aiTheme}
                    onChange={e => setAiTheme(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiIdeas}
                disabled={aiGenerating || !aiTheme.trim()}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {aiGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Synthesizing Event Concepts...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Brainstorm 3 Event Concepts</>
                )}
              </button>

              {/* Generated Ideas Preview List */}
              {generatedIdeas.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Select an Idea to Submit for President Approval
                  </p>
                  {generatedIdeas.map((idea, idx) => {
                    const isSubmitting = submittingIdea === idea.title
                    return (
                      <div
                        key={idx}
                        className="rounded-xl p-4 border transition-all"
                        style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-purple text-[10px]">{idea.format || 'Event'}</span>
                              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                {idea.title}
                              </h4>
                            </div>
                            <p className="text-xs text-muted mt-1 italic">"{idea.tagline}"</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-400">₹{idea.estimated_budget?.toLocaleString()}</span>
                            <p className="text-[10px] text-muted">Budget</p>
                          </div>
                        </div>

                        <p className="text-xs mt-2.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {idea.description}
                        </p>

                        <div className="mt-3.5 pt-2.5 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-[11px] text-muted flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> All members will be notified
                          </span>
                          <button
                            onClick={() => handleLaunchAndRequestApproval(idea)}
                            disabled={isSubmitting}
                            className="btn-primary text-xs py-1.5 px-3 bg-gradient-to-r from-purple-500 to-cyan-500 shadow-sm"
                          >
                            {isSubmitting ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                            ) : (
                              <><Send className="w-3.5 h-3.5" /> Submit to President</>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
