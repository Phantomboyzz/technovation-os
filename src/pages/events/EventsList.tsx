import { useEffect, useState } from 'react'
import { Plus, Filter, Search, Calendar, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard } from '@/components/common'
import { cn, getEventStatusColor, getEventStatusLabel, getEventProgress, formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can, getRoleName } from '@/lib/permissions'

export default function EventsList() {
  const { events, setEvents } = useEventStore()
  const { profile } = useAuthStore()
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')

  useEffect(() => {
    loadEvents()
  }, [])

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

  const role = getRoleName(profile)
  const canCreate = can(profile, 'events', 'create')
  const departments = Array.from(new Set(events.map(e => e.departments?.name).filter(Boolean))) as string[]

  if (loading) return <LoadingSpinner size="lg" message="Loading events..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Events</h1>
          <p className="text-muted mt-1">Manage all society events</p>
        </div>
        {canCreate && (
          <Link to="/events/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Event
          </Link>
        )}
      </div>

      {/* Filters */}
      <GlassCard padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-12"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="ideas_collecting">Ideation</option>
              <option value="proposal_submitted">Proposal</option>
              <option value="approved">Approved</option>
              <option value="tasks_allocated">Tasks Allocated</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
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
            <p className="text-muted mb-4">{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first event to get started'}</p>
            {canCreate && (
              <Link to="/events/new" className="btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Create Event
              </Link>
            )}
          </div>
        ) : (
          filteredEvents.map(event => (
            <Link key={event.id} to={`/events/${event.id}`} className="glass-card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className={cn('badge', getEventStatusColor(event.status))}>
                  {getEventStatusLabel(event.status)}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 truncate">{event.title}</h3>
              <p className="text-sm text-muted mb-4 line-clamp-2">{event.description || 'No description'}</p>

              <div className="space-y-2 text-sm">
                {event.departments?.name && (
                  <div className="flex items-center gap-2 text-muted">
                    <span className="w-4 h-4">🏢</span>
                    <span>{event.departments.name}</span>
                  </div>
                )}
                {event.event_date && (
                  <div className="flex items-center gap-2 text-muted">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-center gap-2 text-muted">
                    <span className="w-4 h-4">📍</span>
                    <span className="truncate">{event.venue}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-purple to-accent-cyan rounded-full transition-all duration-500"
                    style={{ width: `${getEventProgress(event.status)}%` }}
                  />
                </div>
                <p className="text-xs text-muted text-center mt-1">{getEventProgress(event.status)}% complete</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}