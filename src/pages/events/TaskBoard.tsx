import { useEffect, useState } from 'react'
import {
  Plus, Search, CheckCircle, Clock, Users, Trash2,
  Sparkles, Loader2, Bot, Wand2, UserCheck, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard } from '@/components/common'
import { cn, formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { memberService } from '@/services/memberService'
import { groqChat } from '@/lib/groq'

const COLUMNS = [
  { id: 'pending', label: 'To Do', color: 'slate' },
  { id: 'in_progress', label: 'In Progress', color: 'blue' },
  { id: 'completed', label: 'Done', color: 'green' },
  { id: 'blocked', label: 'Blocked', color: 'rose' },
]

export default function TaskBoard() {
  const { profile } = useAuthStore()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', event_id: '', department_id: '', due_date: '', assigned_to: '' })
  const [events, setEvents] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Record<string, any[]>>({})

  // AI Task Assistant State
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiAssigning, setAiAssigning] = useState<string | null>(null)
  const [aiBreakdownEvent, setAiBreakdownEvent] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiStatusMessage, setAiStatusMessage] = useState('')

  useEffect(() => {
    loadTasks()
    loadOptions()
  }, [])

  const loadOptions = async () => {
    const [eventData, memberData, departmentData] = await Promise.all([
      eventService.getEvents(),
      memberService.getMembers(),
      memberService.getDepartments(),
    ])
    setEvents(eventData)
    setMembers(memberData)
    setDepartments(departmentData)
  }

  const loadTasks = async () => {
    try {
      const data = await eventService.getTasks()
      setTasks(data)
      const assignmentRows = await Promise.all(data.map(task => eventService.getTaskAssignments(task.id)))
      setAssignments(Object.fromEntries(data.map((task, index) => [task.id, assignmentRows[index]])))
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (eventFilter !== 'all' && t.event_id !== eventFilter) return false
    return true
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await eventService.createTask({
        ...newTask,
        created_by: profile?.id,
        status: 'pending',
      })
      await loadTasks()
      setShowCreate(false)
      setNewTask({ title: '', description: '', event_id: '', department_id: '', due_date: '', assigned_to: '' })
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      await eventService.updateTask(taskId, { status: newStatus as any })
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    await eventService.deleteTask(taskId)
    setTasks(tasks.filter(task => task.id !== taskId))
  }

  const handleRequestHandover = async (taskId: string, memberId: string) => {
    if (!memberId) return
    await eventService.assignTask(taskId, memberId, profile!.id)
    const assignmentRows = await eventService.getTaskAssignments(taskId)
    setAssignments(prev => ({ ...prev, [taskId]: assignmentRows }))
  }

  const handleAssignmentResponse = async (taskId: string, assignmentId: string, status: 'accepted' | 'declined') => {
    await eventService.respondToTaskAssignment(assignmentId, status)
    const assignmentRows = await eventService.getTaskAssignments(taskId)
    setAssignments(prev => ({ ...prev, [taskId]: assignmentRows }))
    await loadTasks()
  }

  // AI Task Generation from Event
  const handleAiGenerateTasks = async () => {
    if (!aiBreakdownEvent) return
    const targetEvent = events.find(e => e.id === aiBreakdownEvent)
    if (!targetEvent) return

    setAiGenerating(true)
    setAiStatusMessage('AI analyzing event scope & breaking down deliverables...')
    try {
      const prompt = `Break down this college society event into 4-6 specific, actionable execution tasks.
Event Title: ${targetEvent.title}
Description: ${targetEvent.description || 'College event'}
Departments: ${departments.map(d => d.name).join(', ')}

Return a strict JSON object with an array called "tasks":
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Concrete steps and requirements",
      "due_in_days": 7
    }
  ]
}`
      const response = await groqChat([
        { role: 'system', content: 'You are an autonomous university operations planner. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ], { json: true, maxTokens: 1200 })

      const parsed = JSON.parse(response)
      const generated = parsed.tasks || []

      if (generated.length > 0) {
        setAiStatusMessage(`Synthesizing ${generated.length} tasks into database...`)
        const now = new Date()
        await Promise.all(
          generated.map((gt: any) => {
            const dueDate = new Date(now.getTime() + (gt.due_in_days || 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            return eventService.createTask({
              title: gt.title,
              description: gt.description,
              event_id: targetEvent.id,
              department_id: targetEvent.department_id || (departments[0]?.id || null),
              due_date: dueDate,
              created_by: profile?.id,
              status: 'pending',
            })
          })
        )
        await loadTasks()
        setShowAiModal(false)
        setAiBreakdownEvent('')
        alert(`Successfully auto-generated ${generated.length} tasks with AI!`)
      }
    } catch (err) {
      console.error('Failed to generate tasks via AI:', err)
      alert('Could not generate tasks. Please ensure Groq API key is valid.')
    } finally {
      setAiGenerating(false)
      setAiStatusMessage('')
    }
  }

  // AI Smart Member Matcher for a specific task - ONLY assign to members, never heads
  const handleAiSmartAssign = async (task: any) => {
    // Filter to ONLY members, explicitly excluding presidents, vice_presidents, hods, faculty
    const nonHeadMembers = members.filter(m => {
      const roleName = (m.profiles?.roles?.name || m.role || '').toLowerCase()
      const isHead = ['president', 'vice_president', 'vice president', 'hod', 'faculty', 'faculty advisor'].includes(roleName)
      return !isHead
    })

    const candidatePool = nonHeadMembers.length > 0 ? nonHeadMembers : members

    if (candidatePool.length === 0) {
      alert('No eligible members available for task allocation.')
      return
    }

    setAiAssigning(task.id)
    try {
      const candidates = candidatePool.map(m => ({
        id: m.profiles?.id || m.id,
        name: m.profiles?.full_name || 'Member',
        department: m.departments?.name || 'General',
        skills_and_role: `${m.departments?.name || 'General'} Committee Member`
      }))

      const prompt = `You are the Society Task Automation Officer.
RULE: Tasks MUST ONLY be assigned to operational members, NEVER to executive heads (Presidents, VPs, HODs, Faculty).

Given this task:
Title: "${task.title}"
Description: "${task.description || 'Deliverable'}"

Eligible Member Candidates (Strictly non-heads):
${JSON.stringify(candidates, null, 2)}

Match the task requirements with candidate's departmental skill set.
Return strict JSON: { "selected_id": "...", "reason": "Specific skill match justification in 1 sentence" }`

      const res = await groqChat([
        { role: 'system', content: 'You are an autonomous university operations coordinator. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ], { json: true, maxTokens: 300 })

      const parsed = JSON.parse(res)
      if (parsed.selected_id) {
        const selectedMember = candidatePool.find(m => (m.profiles?.id === parsed.selected_id) || (m.id === parsed.selected_id))
        const memberName = selectedMember?.profiles?.full_name || 'Recommended member'
        const confirmed = confirm(`AI Skill Match Recommendation:\nAssign to member: ${memberName}\n\nSkill Justification: ${parsed.reason || 'Optimal departmental skillset'}\n\nProceed with assignment?`)
        if (confirmed) {
          await handleRequestHandover(task.id, parsed.selected_id)
        }
      }
    } catch (err) {
      console.error('Smart assign error:', err)
      alert('AI Assignment matching failed. You can assign manually below.')
    } finally {
      setAiAssigning(null)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading tasks..." />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Task Board</h1>
          <p className="page-subtitle">Collaborative execution board with AI task breakdown & auto-assignment</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="input w-auto text-sm py-2"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAiModal(true)}
            className="btn-secondary text-sm py-2 border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI Breakdown
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <GlassCard padding="sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search tasks by title or deliverable..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-11 text-sm py-2.5"
          />
        </div>
      </GlassCard>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(column => {
          const colTasks = filteredTasks.filter(t => t.status === column.id)
          return (
            <div
              key={column.id}
              className="flex flex-col rounded-2xl p-3.5 border transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                minHeight: '480px'
              }}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full',
                    column.id === 'pending' ? 'bg-slate-400' :
                    column.id === 'in_progress' ? 'bg-blue-400' :
                    column.id === 'completed' ? 'bg-emerald-400' : 'bg-rose-400'
                  )} />
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{column.label}</h3>
                </div>
                <span className={cn('badge text-xs font-semibold', `badge-${column.color}`)}>
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-1">
                {colTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs opacity-50" style={{ color: 'var(--text-muted)' }}>
                    No tasks
                  </div>
                ) : (
                  colTasks.map(task => {
                    const taskAssignments = assignments[task.id] || []
                    const pendingAssignment = taskAssignments.find(a => a.status === 'pending')
                    const isAssignee = pendingAssignment?.assigned_to === profile?.id
                    const isAssigningCurrent = aiAssigning === task.id

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl p-3.5 border transition-all duration-200 hover:shadow-md"
                        style={{
                          background: 'var(--glass-bg-strong)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                            {task.title}
                          </h4>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-muted hover:text-rose-400 transition-colors p-1"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          {task.events?.title && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium truncate max-w-[140px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                              📅 {task.events.title}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium text-amber-400" style={{ background: 'rgba(245,158,11,0.1)' }}>
                              ⏳ {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>

                        {/* Assignee Information */}
                        <div className="mt-2.5 flex items-center justify-between text-xs">
                          <span className="text-muted">Assigned:</span>
                          <span className="font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>
                            {task.profiles?.full_name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Handover notification if pending */}
                        {pendingAssignment && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                            <p className="font-semibold">Assignment pending response</p>
                            {isAssignee && (
                              <div className="flex gap-2 mt-1.5">
                                <button
                                  onClick={() => handleAssignmentResponse(task.id, pendingAssignment.id, 'accepted')}
                                  className="btn-success py-1 px-2 text-[11px]"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleAssignmentResponse(task.id, pendingAssignment.id, 'declined')}
                                  className="btn-danger py-1 px-2 text-[11px]"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="mt-3 pt-2 flex items-center justify-between gap-1 border-t" style={{ borderColor: 'var(--border)' }}>
                          {/* AI Smart Assign Button */}
                          <button
                            onClick={() => handleAiSmartAssign(task)}
                            disabled={isAssigningCurrent}
                            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md text-purple-400 hover:bg-purple-500/10 transition-colors border border-purple-500/30"
                            title="Let AI match best member based on skillset"
                          >
                            {isAssigningCurrent ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Wand2 className="w-3 h-3" />
                            )}
                            AI Assign
                          </button>

                          {/* Move Column */}
                          <select
                            value={task.status}
                            onChange={e => handleUpdateStatus(task.id, e.target.value)}
                            className="text-[11px] py-1 px-2 rounded-md bg-white/5 border border-white/10 text-foreground cursor-pointer"
                          >
                            <option value="pending">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Done</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Manual Task Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md border shadow-glass" style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Create New Task</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/10 text-muted">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="e.g. Design Event Promotional Banner"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                  placeholder="Key milestones and requirements..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Event *</label>
                  <select
                    value={newTask.event_id}
                    onChange={e => setNewTask(prev => ({ ...prev, event_id: e.target.value }))}
                    className="input"
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select
                    value={newTask.department_id}
                    onChange={e => setNewTask(prev => ({ ...prev, department_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Select Dept</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Event Breakdown Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg border shadow-glass" style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                  AI Event Task Breakdown
                </h2>
                <p className="text-xs text-muted">Automatically turn an event into organized deliverables</p>
              </div>
              <button onClick={() => setShowAiModal(false)} className="ml-auto p-1 rounded-lg hover:bg-white/10 text-muted">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Select Event to Plan</label>
                <select
                  value={aiBreakdownEvent}
                  onChange={e => setAiBreakdownEvent(e.target.value)}
                  className="input"
                >
                  <option value="">Select an event...</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title} ({ev.status})</option>
                  ))}
                </select>
              </div>

              {aiStatusMessage && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2.5 text-xs text-purple-300 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>{aiStatusMessage}</span>
                </div>
              )}

              <div className="rounded-xl p-3 bg-white/5 border border-white/10 text-xs text-muted leading-relaxed">
                💡 <strong>How AI Breakdown Works:</strong> Groq examines the event objectives and auto-creates ready-to-execute tasks with suggested deadlines across logistics, promotions, technology, and finances.
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setShowAiModal(false)} className="btn-secondary">Cancel</button>
                <button
                  type="button"
                  onClick={handleAiGenerateTasks}
                  disabled={aiGenerating || !aiBreakdownEvent}
                  className="btn-primary"
                >
                  {aiGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Execution Tasks</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
