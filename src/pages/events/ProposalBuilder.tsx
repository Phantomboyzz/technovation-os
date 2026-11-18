import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Sparkles, FileText, ArrowLeft, ArrowRight, Save, Send } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'
import { groqChat } from '@/lib/groq'
import { supabase } from '@/lib/supabase'

export default function ProposalBuilder() {
  const { id } = useParams<{ id: string }>()
  const { events, setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [event, setEvent] = useState<any>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [ideas, setIdeas] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: '',
    objectives: '',
    budget_estimate: '',
    timeline: '',
    departments_involved: [] as string[],
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const data = await eventService.getEvent(id!)
      setEvent(data)
      if (data) {
        const [ideasData, proposalData] = await Promise.all([
          eventService.getEventIdeas(data.id),
          eventService.getProposals(data.id).catch(() => []),
        ])
        setIdeas(ideasData)
        if (proposalData?.[0]) {
          setProposal(proposalData[0])
          setFormData({
            title: proposalData[0].title,
            objectives: proposalData[0].objectives || '',
            budget_estimate: proposalData[0].budget_estimate?.toString() || '',
            timeline: proposalData[0].timeline || '',
            departments_involved: [],
          })
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!event || !ideas.length) return
    setGenerating(true)
    try {
      // Use the first top-voted idea
      const topIdea = ideas.sort((a, b) => b.upvotes - a.upvotes)[0]
      const content = await groqChat([
        { role: 'system', content: 'Create a detailed event proposal and return valid JSON.' },
        { role: 'user', content: `Create a proposal for event "${event.title}" from idea "${topIdea.title}: ${topIdea.description}". Return {"title":"...","objectives":["..."],"budget_estimate":0,"timeline":"...","departments_involved":["..."],"tasks":[{"title":"...","department":"...","due_days":7,"description":"..."}]}` },
      ], { json: true, maxTokens: 2000 })
      const data = JSON.parse(content)
      const p = data.proposal || data
      if (p?.title) {
        setFormData({
          title: p.title,
          objectives: p.objectives?.join('\n') || '',
          budget_estimate: p.budget_estimate?.toString() || '',
          timeline: p.timeline || '',
          departments_involved: p.departments_involved || [],
        })
        for (const task of p.tasks || []) {
          let departmentId: string | null = event.department_id
          if (task.department) {
            const { data: department } = await supabase
              .from('departments')
              .select('id')
              .eq('name', task.department)
              .maybeSingle()
            departmentId = department?.id || departmentId
          }
          await eventService.createTask({
            event_id: event.id,
            department_id: departmentId,
            title: task.title,
            description: task.description || '',
            due_date: new Date(Date.now() + (task.due_days || 7) * 24 * 60 * 60 * 1000).toISOString(),
            created_by: profile?.id,
            status: 'pending',
          })
        }
      }
    } catch (err) {
      console.error('Failed to generate proposal:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (submit = false) => {
    if (!event) return
    setSaving(true)
    try {
      const data = {
        event_id: event.id,
        title: formData.title,
        objectives: formData.objectives,
        budget_estimate: formData.budget_estimate ? parseFloat(formData.budget_estimate) : null,
        timeline: formData.timeline,
        status: submit ? 'pending' : 'draft',
        submitted_by: profile?.id,
      }

      if (proposal) {
        await eventService.updateProposal(proposal.id, data as any)
      } else {
        const created = await eventService.createProposal(data as any)
        setProposal(created)
      }

      if (submit) {
        await eventService.updateEvent(event.id, { status: 'proposal_submitted' as any })
        setEvent((prev: any) => ({ ...prev, status: 'proposal_submitted' as any }))
        setEvents(events.map(e => e.id === event.id ? { ...e, status: 'proposal_submitted' as any } : e))
      }
    } catch (err) {
      console.error('Failed to save proposal:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading..." />
  if (!event) return <div className="glass-card text-center py-16">Event not found</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/events/${id}`} className="p-2 glass rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('badge', getEventStatusColor(event.status))}>
                {getEventStatusLabel(event.status)}
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold">Proposal Builder</h1>
            <p className="text-muted">{event.title}</p>
          </div>
        </div>
      </div>

      {/* AI Generation */}
      {ideas.length > 0 && !proposal && (
        <GlassCard className="border-accent-purple/30 bg-purple-500/5">
          <GlassCardHeader title="AI Proposal Generation" subtitle="Generate a complete proposal from top-voted ideas" />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate Proposal with AI'}
          </button>
        </GlassCard>
      )}

      {/* Proposal Form */}
      <GlassCard>
        <GlassCardHeader title="Proposal Details" />
        <form className="space-y-6">
          <div>
            <label className="label">Proposal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input"
              placeholder="Enter proposal title"
              required
            />
          </div>

          <div>
            <label className="label">Objectives</label>
            <textarea
              value={formData.objectives}
              onChange={e => setFormData(prev => ({ ...prev, objectives: e.target.value }))}
              className="input min-h-[150px] resize-y"
              placeholder="List the objectives of this event, one per line..."
              required
            />
            <p className="text-xs text-muted mt-1">One objective per line</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Budget Estimate (INR)</label>
              <input
                type="number"
                value={formData.budget_estimate}
                onChange={e => setFormData(prev => ({ ...prev, budget_estimate: e.target.value }))}
                className="input"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="label">Timeline</label>
              <input
                type="text"
                value={formData.timeline}
                onChange={e => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                className="input"
                placeholder="e.g., 2 weeks planning + 1 day event"
              />
            </div>
          </div>

          <div>
            <label className="label">Departments Involved</label>
            <div className="flex flex-wrap gap-2">
              {event.departments?.name && (
                <span className="badge-blue">{event.departments.name}</span>
              )}
            </div>
          </div>

          {/* Preview from Ideas */}
          {ideas.length > 0 && (
            <div className="border-t border-white/10 pt-6">
              <h4 className="font-medium mb-3">Top Ideas (for reference)</h4>
              <div className="space-y-2">
                {ideas
                  .sort((a, b) => b.upvotes - a.upvotes)
                  .slice(0, 3)
                  .map(idea => (
                    <div key={idea.id} className="glass p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {idea.ai_generated && <span className="badge-purple text-xs">AI</span>}
                        <span className="font-medium">{idea.title}</span>
                      </div>
                      <span className="text-sm text-muted">↑ {idea.upvotes}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </form>
      </GlassCard>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link to={`/events/${id}`} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !formData.title || !formData.objectives}
          className="btn-secondary"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || !formData.title || !formData.objectives || proposal?.status === 'pending'}
          className="btn-primary"
        >
          <Send className="w-4 h-4" />
          {proposal?.status === 'pending' ? 'Submitted for Approval' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  )
}

