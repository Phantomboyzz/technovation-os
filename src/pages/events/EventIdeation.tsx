import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Lightbulb, ArrowRight } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel, formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'
import { groqChat } from '@/lib/groq'

export default function EventIdeation() {
  const { id } = useParams<{ id: string }>()
  const { events, setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [event, setEvent] = useState<any>(null)
  const [ideas, setIdeas] = useState<any[]>([])
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: 'Technical' })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const categories = ['Technical', 'Cultural', 'Entrepreneurship', 'Sports', 'Social Impact', 'Workshop', 'Competition', 'Other']

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const data = await eventService.getEvent(id!)
      setEvent(data)
      if (data) {
        const ideasData = await eventService.getEventIdeas(data.id)
        setIdeas(ideasData)
      }
    } catch (err) {
      console.error('Failed to load event:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!event) return
    setGenerating(true)
    try {
      const departmentName = event.departments?.name || 'Technical'
      const content = await groqChat([
        { role: 'system', content: 'Generate practical event ideas and return valid JSON.' },
        { role: 'user', content: `Generate 5 event ideas for the ${departmentName} department. Theme: ${event.description || 'General society engagement'}. Return {"ideas":[{"title":"...","description":"...","category":"...","budget_estimate":0,"timeline":"..."}]}` },
      ], { json: true, maxTokens: 1500 })
      const data = JSON.parse(content)
      const generated = data.ideas || []
      if (generated.length) {
        const inserted = await Promise.all(generated.map((idea: any) => eventService.createIdea({
          event_id: event.id,
          title: idea.title,
          description: idea.description,
          category: idea.category || 'Other',
          ai_generated: true,
          created_by: profile?.id,
        })))
        setIdeas([...ideas, ...inserted])
        await eventService.updateEvent(event.id, { status: 'ideas_collecting' as any })
        setEvent((prev: any) => ({ ...prev, status: 'ideas_collecting' as any }))
        setEvents(events.map(e => e.id === event.id ? { ...e, status: 'ideas_collecting' as any } : e))
      }
    } catch (err) {
      console.error('Failed to generate ideas:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIdea.title.trim() || !event) return
    try {
      await eventService.createIdea({
        event_id: event.id,
        title: newIdea.title,
        description: newIdea.description,
        category: newIdea.category,
        ai_generated: false,
        created_by: profile?.id,
      })
      const ideasData = await eventService.getEventIdeas(event.id)
      setIdeas(ideasData)
      setNewIdea({ title: '', description: '', category: 'Technical' })
    } catch (err) {
      console.error('Failed to submit idea:', err)
    }
  }

  const handleUpvote = async (ideaId: string) => {
    try {
      await eventService.upvoteIdea(ideaId)
      const ideasData = await eventService.getEventIdeas(event!.id)
      setIdeas(ideasData)
    } catch (err) {
      console.error('Failed to upvote:', err)
    }
  }

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Delete this idea?')) return
    try {
      await eventService.deleteIdea(ideaId)
      setIdeas(ideas.filter(idea => idea.id !== ideaId))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading..." />
  if (!event) return <div className="glass-card text-center py-16">Event not found</div>

  const canManage = can(profile, 'events', 'create')

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/events/${id}`} className="p-2 glass rounded-xl hover:bg-white/5">
            <ArrowUp className="w-5 h-5 rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('badge', getEventStatusColor(event.status))}>
                {getEventStatusLabel(event.status)}
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold">Event Ideation</h1>
            <p className="text-muted">{event.title}</p>
          </div>
        </div>
      </div>

      {/* AI Generation */}
      <GlassCard>
        <GlassCardHeader title="AI-Powered Ideation" subtitle="Generate creative event ideas using AI" />
        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={generating || ideas.length > 0}
            className="btn-primary w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating...' : ideas.length > 0 ? 'Ideas Already Generated' : 'Generate 5 Ideas with AI'}
          </button>
          {ideas.length > 0 && (
            <p className="text-sm text-green-400">
              ✓ {ideas.length} AI ideas generated. You can now submit a proposal.
            </p>
          )}
        </div>
      </GlassCard>

      {/* Submit New Idea */}
      {canManage && (
        <GlassCard>
          <GlassCardHeader title="Submit Your Idea" />
          <form onSubmit={handleSubmitIdea} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="Enter idea title"
                  required
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  value={newIdea.category}
                  onChange={e => setNewIdea(prev => ({ ...prev, category: e.target.value }))}
                  className="input"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={newIdea.description}
                onChange={e => setNewIdea(prev => ({ ...prev, description: e.target.value }))}
                className="input min-h-[100px] resize-y"
                placeholder="Describe your idea..."
              />
            </div>
            <button type="submit" className="btn-primary">
              <Plus className="w-4 h-4" />
              Submit Idea
            </button>
          </form>
        </GlassCard>
      )}

      {/* Ideas List */}
      <GlassCard>
        <GlassCardHeader title="All Ideas" subtitle={`${ideas.length} ideas submitted`} />
        <div className="space-y-3">
          {ideas.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No ideas yet. {canManage ? 'Submit your first idea or generate with AI!' : 'Ideas will appear here once submitted.'}</p>
            </div>
          ) : (
            ideas
              .sort((a, b) => b.upvotes - a.upvotes)
              .map(idea => (
                <div key={idea.id} className="glass p-4 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{idea.title}</h4>
                      {idea.ai_generated && <span className="badge-purple text-xs">AI Generated</span>}
                      <span className="badge-blue text-xs">{idea.category}</span>
                    </div>
                    <p className="text-sm text-muted mb-2">{idea.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>By {idea.profiles?.full_name || 'Anonymous'}</span>
                      <span>{formatDate(idea.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpvote(idea.id)}
                      className="p-2 glass rounded-xl hover:bg-white/5 transition-colors flex items-center gap-1"
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span className="font-medium">{idea.upvotes}</span>
                    </button>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="p-2 glass rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </GlassCard>

      {/* Next Step */}
      {ideas.length > 0 && canManage && event.status === 'ideas_collecting' && (
        <GlassCard className="border-accent-purple/30 bg-purple-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ready for the next step?</h3>
              <p className="text-sm text-muted">Create a detailed proposal from these ideas</p>
            </div>
            <Link to={`/events/${id}/proposal`} className="btn-primary">
              <ArrowRight className="w-4 h-4" />
              Create Proposal
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

