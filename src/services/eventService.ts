import { supabase } from '@/lib/supabase'
import type { Event, EventIdea, Proposal, Task, TaskAssignment } from '@/types/schema'

export const eventService = {
  async getEvents(departmentId?: string | null): Promise<Event[]> {
    let query = supabase
      .from('events')
      .select('*, departments(*)')
      .order('created_at', { ascending: false })
    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getEvent(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*, departments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createEvent(event: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase.from('events').insert(event).select().single()
    if (error) throw error
    return data
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) throw error
  },

  async getEventIdeas(eventId: string): Promise<EventIdea[]> {
    const { data, error } = await supabase
      .from('event_ideas')
      .select('*')
      .eq('event_id', eventId)
      .order('upvotes', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createIdea(idea: Partial<EventIdea>): Promise<EventIdea> {
    const { data, error } = await supabase.from('event_ideas').insert(idea).select().single()
    if (error) throw error
    return data
  },

  async deleteIdea(id: string): Promise<void> {
    const { error } = await supabase.from('event_ideas').delete().eq('id', id)
    if (error) throw error
  },

  async upvoteIdea(id: string): Promise<void> {
    const { error } = await supabase.rpc('upvote_idea', { idea_id: id })
    if (error) throw error
  },

  async getProposals(eventId?: string): Promise<Proposal[]> {
    let query = supabase.from('proposals').select('*').order('submitted_at', { ascending: false })
    if (eventId) query = query.eq('event_id', eventId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async createProposal(proposal: Partial<Proposal>): Promise<Proposal> {
    const { data, error } = await supabase.from('proposals').insert(proposal).select().single()
    if (error) throw error
    return data
  },

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .update({ ...updates, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getTasks(eventId?: string, assignedTo?: string): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*, departments(*), profiles!tasks_assigned_to_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (eventId) query = query.eq('event_id', eventId)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (error) throw error
    return data
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  },

  async assignTask(taskId: string, memberId: string, assignedBy: string): Promise<TaskAssignment> {
    const { data, error } = await supabase
      .from('task_assignments')
      .insert({ task_id: taskId, member_id: memberId, assigned_by: assignedBy })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*, profiles!task_assignments_member_id_fkey(full_name, avatar_url)')
      .eq('task_id', taskId)
    if (error) throw error
    return data || []
  },

  async respondToTaskAssignment(assignmentId: string, status: 'accepted' | 'declined'): Promise<TaskAssignment> {
    const { data, error } = await supabase
      .from('task_assignments')
      .update({ status })
      .eq('id', assignmentId)
      .select()
      .single()
    if (error) throw error

    if (status === 'accepted') {
      await supabase
        .from('tasks')
        .update({ assigned_to: data.member_id })
        .eq('id', data.task_id)
    }
    return data
  },
}