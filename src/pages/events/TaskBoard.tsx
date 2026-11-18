import { useEffect, useState } from 'react'
import { Plus, Filter, Search, CheckCircle, Clock, Users, MoreVertical, Edit, Trash2, ArrowRight, ArrowLeft } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, formatDate, getEventStatusColor, getEventStatusLabel } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'
import { canAssign } from '@/lib/permissions'
import { memberService } from '@/services/memberService'

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
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
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
      loadTasks()
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

  if (loading) return <LoadingSpinner size="lg" message="Loading tasks..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Task Board</h1>
          <p className="text-muted mt-1">Kanban board for all tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      <GlassCard padding="sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-12"
          />
        </div>
      </GlassCard>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(column => (
          <div key={column.id} className="min-w-[300px] max-w-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold capitalize">{column.label}</h3>
              <span className={cn('badge', `badge-${column.color}`)}>
                {filteredTasks.filter(t => t.status === column.id).length}
              </span>
            </div>
            <div
              className="flex-1 space-y-3 min-h-[400px] glass rounded-xl p-3"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const taskId = e.dataTransfer.getData('taskId')
                if (taskId) handleUpdateStatus(taskId, column.id)
              }}
            >
              {filteredTasks
                .filter(t => t.status === column.id)
                .map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('taskId', task.id)}
                    className="glass-card-hover p-4 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <div className="flex items-center gap-1">
                        <button className="p-1 glass rounded hover:bg-white/5" onClick={e => { e.stopPropagation(); handleDelete(task.id) }}>
                          <Trash2 className="w-4 h-4 text-muted" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-muted mb-2 line-clamp-2">{task.description || 'No description'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted mb-2">
                      {task.events && (
                        <span className="badge-blue text-xs">{task.events.title}</span>
                      )}
                      {task.departments && (
                        <span className="badge-purple text-xs">{task.departments.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {task.due_date && (
                        <span className={cn('flex items-center gap-1', new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-rose-400' : '')}>
                          <Clock className="w-3 h-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      {task.profiles && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {task.profiles.full_name}
                        </span>
                      )}
                    </div>
                    {canAssign(profile) && (
                      <select
                        className="input mt-3 text-xs py-2"
                        defaultValue=""
                        onChange={e => handleRequestHandover(task.id, e.target.value)}
                      >
                        <option value="">Request responsibility transfer</option>
                        {members
                          .filter(member => member.profile_id !== task.assigned_to)
                          .map(member => (
                            <option key={member.profile_id} value={member.profile_id}>
                              {member.profiles?.full_name || member.roll_number || 'Member'}
                            </option>
                          ))}
                      </select>
                    )}
                    {(assignments[task.id] || []).filter(a => a.status === 'pending').map(assignment => (
                      <div key={assignment.id} className="mt-2 flex items-center justify-between gap-2 text-xs glass rounded-lg px-2 py-2">
                        <span className="text-amber-400">Transfer pending</span>
                        {assignment.member_id === profile?.id && (
                          <div className="flex gap-2">
                            <button onClick={() => handleAssignmentResponse(task.id, assignment.id, 'accepted')} className="text-green-400">Accept</button>
                            <button onClick={() => handleAssignmentResponse(task.id, assignment.id, 'declined')} className="text-rose-400">Decline</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold">Create Task</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 glass rounded-xl hover:bg-white/5">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                />
              </div>
              <div>
                <label className="label">Event</label>
                <select
                  value={newTask.event_id}
                  onChange={e => setNewTask(prev => ({ ...prev, event_id: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Select event</option>
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
                  <option value="">Select department</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
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
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

