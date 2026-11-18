import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Zap, X } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { automationService } from '@/services/automationService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'

// Reuse the form component from AutomationRules
function AutomationBuilderForm({ initialData, onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    trigger: initialData?.trigger || { type: 'db_change' },
    conditions: initialData?.conditions || {},
    actions: initialData?.actions || [],
    is_active: initialData?.is_active !== false,
  })
  const [triggerType, setTriggerType] = useState(initialData?.trigger?.type || 'db_change')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ ...formData, trigger: { ...formData.trigger, type: triggerType } })
  }

  const updateAction = (index: number, newAction: any) => {
    const newActions = [...formData.actions]
    newActions[index] = newAction
    setFormData(prev => ({ ...prev, actions: newActions }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="label">Rule Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Trigger Type</label>
        <select
          value={triggerType}
          onChange={e => { setTriggerType(e.target.value); setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, type: e.target.value } })) }}
          className="input"
        >
          <option value="db_change">Database Change</option>
          <option value="schedule">Scheduled (Cron)</option>
          <option value="webhook">Webhook</option>
          <option value="event">Event Status Change</option>
        </select>
      </div>

      {/* Trigger Config */}
      <div className="glass p-4 rounded-xl space-y-4">
        <h4 className="font-medium">Trigger Configuration</h4>
        {triggerType === 'schedule' && (
          <div>
            <label className="label">Cron Expression</label>
            <input
              type="text"
              value={formData.trigger.cron || '* * * * *'}
              onChange={e => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, cron: e.target.value } }))}
              className="input font-mono"
              placeholder="* * * * * (every minute)"
            />
            <p className="text-xs text-muted mt-1">Every minute: * * * * * | Hourly: 0 * * * * | Daily: 0 0 * * *</p>
          </div>
        )}
        {triggerType === 'db_change' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Table</label>
              <select
                value={formData.trigger.table || 'events'}
                onChange={e => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, table: e.target.value } }))}
                className="input"
              >
                <option value="events">Events</option>
                <option value="proposals">Proposals</option>
                <option value="tasks">Tasks</option>
                <option value="event_ideas">Event Ideas</option>
              </select>
            </div>
            <div>
              <label className="label">Operation</label>
              <select
                value={formData.trigger.operation || 'UPDATE'}
                onChange={e => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, operation: e.target.value } }))}
                className="input"
              >
                <option value="INSERT">Insert</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>
            <div>
              <label className="label">Field (optional)</label>
              <input
                type="text"
                value={formData.trigger.field || ''}
                onChange={e => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, field: e.target.value } }))}
                className="input"
                placeholder="e.g., status"
              />
            </div>
            <div>
              <label className="label">Value (optional)</label>
              <input
                type="text"
                value={formData.trigger.value || ''}
                onChange={e => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, value: e.target.value } }))}
                className="input"
                placeholder="e.g., approved"
              />
            </div>
          </div>
        )}
        {triggerType === 'event' && (
          <div>
            <label className="label">Event Status</label>
            <select
              value={formData.trigger.value || 'approved'}
              onChange={e => setFormData(prev => ({ ...prev, trigger: { ...prev.trigger, value: e.target.value } }))}
              className="input"
            >
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Actions</h4>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, actions: [...prev.actions, { type: 'notify' }] }))}
            className="btn-secondary text-sm"
          >
            <Plus className="w-4 h-4" /> Add Action
          </button>
        </div>
        <div className="space-y-3">
          {formData.actions.map((action: any, index: number) => (
            <GlassCard key={index} padding="sm">
              <div className="flex items-center justify-between mb-3">
                <select
                  value={action.type}
                  onChange={e => {
                    const newActions = [...formData.actions]
                    newActions[index] = { ...newActions[index], type: e.target.value }
                    setFormData(prev => ({ ...prev, actions: newActions }))
                  }}
                  className="input w-auto"
                >
                  <option value="notify">Send Notification</option>
                  <option value="create_task">Create Task</option>
                  <option value="assign_member">Assign Member</option>
                  <option value="update_status">Update Status</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newActions = formData.actions.filter((_: any, i: number) => i !== index)
                    setFormData(prev => ({ ...prev, actions: newActions }))
                  }}
                  className="p-1 glass rounded hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {action.type === 'notify' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Send To Role</label>
                    <select
                      value={action.to_role || ''}
                      onChange={e => updateAction(index, { ...action, to_role: e.target.value })}
                      className="input"
                    >
                      <option value="">All Members</option>
                      <option value="president">President</option>
                      <option value="vice_president">Vice President</option>
                      <option value="hod">HOD</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Title</label>
                    <input
                      type="text"
                      value={action.title || ''}
                      onChange={e => updateAction(index, { ...action, title: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Message</label>
                    <input
                      type="text"
                      value={action.message || ''}
                      onChange={e => updateAction(index, { ...action, message: e.target.value })}
                      className="input"
                      placeholder="Use {{variable}} for dynamic content"
                    />
                  </div>
                </div>
              )}

              {action.type === 'create_task' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Task Title</label>
                    <input
                      type="text"
                      value={action.title || ''}
                      onChange={e => updateAction(index, { ...action, title: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Due Days</label>
                    <input
                      type="number"
                      value={action.due_days || 7}
                      onChange={e => updateAction(index, { ...action, due_days: parseInt(e.target.value) })}
                      className="input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      value={action.description || ''}
                      onChange={e => updateAction(index, { ...action, description: e.target.value })}
                      className="input min-h-[80px] resize-y"
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          className="w-4 h-4 accent-purple"
        />
        <label htmlFor="is_active" className="text-sm">Active</label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">
          <Save className="w-4 h-4" />
          {initialData ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </form>
  )
}

import { Plus } from 'lucide-react'

export default function AutomationBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadRule()
    } else {
      setLoading(false)
    }
  }, [id])

  const loadRule = async () => {
    try {
      const { data } = await import('@/services/automationService').then(m =>
        m.automationService.getRules()
      ).then(rules => ({ data: rules.find(r => r.id === id) }))
      setInitialData(data)
    } catch (err) {
      console.error('Failed to load rule:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      if (id) {
        await automationService.updateRule(id, data)
      } else {
        await automationService.createRule(data)
      }
      navigate('/automation')
    } catch (err) {
      console.error('Failed to save rule:', err)
      alert('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/automation')
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading..." />

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={handleCancel} className="p-2 glass rounded-xl hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            {id ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </h1>
          <p className="text-muted">Configure triggers, conditions & actions</p>
        </div>
      </div>

      <AutomationBuilderForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}
