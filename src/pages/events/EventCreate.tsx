import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, DollarSign, Save, Sparkles, Loader2, Wand2 } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { memberService } from '@/services/memberService'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { groqChat } from '@/lib/groq'

export default function EventCreate() {
  const navigate = useNavigate()
  const { setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiTopic, setAiTopic] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_id: '',
    event_date: '',
    venue: '',
    budget: '',
  })

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      const data = await memberService.getDepartments()
      setDepartments(data)
      if (data.length > 0 && !formData.department_id) {
        setFormData(prev => ({ ...prev, department_id: data[0].id }))
      }
    } catch (err) {
      console.error('Failed to load departments:', err)
    }
  }

  // AI Event Ideation & Auto-fill
  const handleAiFillEvent = async () => {
    if (!aiTopic.trim()) return
    setAiGenerating(true)
    try {
      const selectedDept = departments.find(d => d.id === formData.department_id)
      const deptName = selectedDept ? selectedDept.name : 'Technical'

      const prompt = `You are a college society event planning expert.
Topic/Keyword: "${aiTopic}"
Department: "${deptName}"

Suggest an exciting, realistic college event.
Return a strict JSON object with:
{
  "title": "A catchy, professional title",
  "description": "2-3 comprehensive sentences explaining objectives, format, and student takeaways.",
  "venue": "Suggested on-campus venue (e.g. Auditorium, Lab 304, Seminar Hall)",
  "budget": 15000
}`

      const res = await groqChat([
        { role: 'system', content: 'You are an operations assistant for student societies. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ], { json: true, maxTokens: 400 })

      const parsed = JSON.parse(res)
      setFormData(prev => ({
        ...prev,
        title: parsed.title || prev.title,
        description: parsed.description || prev.description,
        venue: parsed.venue || prev.venue,
        budget: parsed.budget ? parsed.budget.toString() : prev.budget,
      }))
    } catch (err) {
      console.error('AI fill error:', err)
      alert('Could not complete AI suggestion. Please check your Groq API connection.')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const newEvent = await eventService.createEvent({
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
        created_by: profile?.id,
        status: 'draft',
      })
      navigate(`/events/${newEvent.id}`)
    } catch (err) {
      console.error('Failed to create event:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2" title="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">Create New Event</h1>
          <p className="page-subtitle">Design an event draft or use AI to generate the concept</p>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <GlassCard className="border border-purple-500/30" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.05))' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Idea Generator</h3>
              <p className="text-xs text-muted">Enter a concept (e.g. "Robotics Battle", "AI Hackathon", "Photography Hunt")</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. AI Prompt Challenge"
              value={aiTopic}
              onChange={e => setAiTopic(e.target.value)}
              className="input text-xs py-2 w-48 sm:w-56"
            />
            <button
              type="button"
              onClick={handleAiFillEvent}
              disabled={aiGenerating || !aiTopic.trim()}
              className="btn-primary text-xs py-2 px-3 whitespace-nowrap"
            >
              {aiGenerating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...</>
              ) : (
                <><Wand2 className="w-3.5 h-3.5" /> Auto-Fill</>
              )}
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Event Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input"
              placeholder="e.g. Autonomous Bot Combat 2026"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input min-h-[110px] resize-y"
              placeholder="Outline the core objective, agenda, and participation rules..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Department *</label>
              <select
                value={formData.department_id}
                onChange={e => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                className="input"
                required
              >
                <option value="">Select department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Event Date</label>
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={e => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                className="input"
                placeholder="e.g. Main Auditorium / Tech Lab"
              />
            </div>
            <div>
              <label className="label">Budget Estimate (INR)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                className="input"
                placeholder="0"
                min="0"
                step="500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Creating Draft...' : 'Create Event'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
