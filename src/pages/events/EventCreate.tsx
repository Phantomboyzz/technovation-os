import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, DollarSign, Save, Plus } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { memberService } from '@/services/memberService'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'

export default function EventCreate() {
  const navigate = useNavigate()
  const { setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

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
    } catch (err) {
      console.error('Failed to load departments:', err)
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
      setEvents([newEvent, ...useEventStore.getState().events])
      navigate(`/events/${newEvent.id}`)
    } catch (err) {
      console.error('Failed to create event:', err)
      alert('Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading..." />

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass rounded-xl hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Create Event</h1>
          <p className="text-muted">Start a new event for your society</p>
        </div>
      </div>

      <GlassCard>
        <GlassCardHeader title="Event Details" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Event Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input"
              placeholder="Enter event title"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input min-h-[100px] resize-y"
              placeholder="Describe the event..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
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
                placeholder="Event location"
              />
            </div>
            <div>
              <label className="label">Budget (INR)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                className="input"
                placeholder="0"
                min="0"
                step="100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

