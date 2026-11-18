import { useEffect, useState } from 'react'
import { Plus, Zap, Play, Pause, Trash2, Edit, Eye, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { automationService } from '@/services/automationService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, formatDate, timeAgo } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'

const TRIGGER_LABELS: Record<string, string> = {
  db_change: 'Database Change',
  schedule: 'Scheduled',
  webhook: 'Webhook',
  event: 'Event',
}

const ACTION_LABELS: Record<string, string> = {
  notify: 'Send Notification',
  create_task: 'Create Task',
  assign_member: 'Assign Member',
  update_status: 'Update Status',
  send_email: 'Send Email',
}

export default function AutomationRules() {
  const { profile } = useAuthStore()
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const data = await automationService.getRules()
      setRules(data)
    } catch (err) {
      console.error('Failed to load rules:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (rule: any) => {
    try {
      await automationService.updateRule(rule.id, { is_active: !rule.is_active })
      setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    } catch (err) {
      console.error('Failed to toggle rule:', err)
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this automation rule?')) return
    try {
      await automationService.deleteRule(ruleId)
      setRules(rules.filter(r => r.id !== ruleId))
    } catch (err) {
      console.error('Failed to delete rule:', err)
    }
  }

  const handleExecute = async (rule: any) => {
    try {
      await automationService.triggerAutomation(rule.id, { manual: true })
      alert('Automation triggered! Check logs for results.')
    } catch (err) {
      console.error('Failed to execute rule:', err)
      alert('Failed to execute automation')
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading automations..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Automation Rules</h1>
          <p className="text-muted mt-1">Configure triggers, conditions & actions</p>
        </div>
        <button onClick={() => { setEditingRule(null); setShowBuilder(true) }} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Zap className="w-16 h-16 mx-auto mb-4 text-muted" />
          <h3 className="text-lg font-medium mb-2">No automation rules yet</h3>
          <p className="text-muted mb-6">Create your first rule to automate workflows</p>
          <button onClick={() => setShowBuilder(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <GlassCard key={rule.id} hover>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-lg font-semibold">{rule.name}</h3>
                    <span className={cn('badge', rule.is_active ? 'badge-green' : 'badge-slate')}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="badge-blue">{TRIGGER_LABELS[rule.trigger?.type] || rule.trigger?.type}</span>
                  </div>
                  <p className="text-sm text-muted mb-3">{rule.trigger?.type === 'schedule' ? `Runs: ${rule.trigger?.cron}` : `Trigger: ${rule.trigger?.type}`}</p>
                  <div className="flex flex-wrap gap-2">
                    {rule.actions?.map((action: any, i: number) => (
                      <span key={i} className="badge-purple text-xs">{ACTION_LABELS[action.type] || action.type}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={cn('p-2 glass rounded-xl', rule.is_active ? 'bg-green-500/10' : 'bg-slate-500/10')}
                    title={rule.is_active ? 'Pause' : 'Activate'}
                  >
                    {rule.is_active ? <Pause className="w-4 h-4 text-green-400" /> : <Play className="w-4 h-4 text-muted" />}
                  </button>
                  <button onClick={() => handleExecute(rule)} className="p-2 glass rounded-xl hover:bg-white/5" title="Run Now">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingRule(rule); setShowBuilder(true) }} className="p-2 glass rounded-xl hover:bg-white/5" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="p-2 glass rounded-xl hover:bg-rose-500/10 hover:text-rose-400" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Builder Modal */}
      {(showBuilder || editingRule) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold">
                {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h2>
              <button onClick={() => { setShowBuilder(false); setEditingRule(null) }} className="p-2 glass rounded-xl hover:bg-white/5">✕</button>
            </div>

            <AutomationBuilderForm
              initialData={editingRule}
              onSubmit={async (data: any) => {
                try {
                  if (editingRule) {
                    await automationService.updateRule(editingRule.id, data)
                  } else {
                    await automationService.createRule(data)
                  }
                  loadRules()
                  setShowBuilder(false)
                  setEditingRule(null)
                } catch (err) {
                  console.error('Failed to save rule:', err)
                  alert('Failed to save rule')
                }
              }}
              onCancel={() => { setShowBuilder(false); setEditingRule(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

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
                  <Trash2 className="w-4 h-4" />
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
          {initialData ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </form>
  )

  function updateAction(index: number, newAction: any) {
    const newActions = [...formData.actions]
    newActions[index] = newAction
    setFormData(prev => ({ ...prev, actions: newActions }))
  }
}

