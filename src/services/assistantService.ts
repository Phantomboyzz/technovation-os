import { supabase } from '@/lib/supabase'
import { groqAgent, groqChat, type GroqMessage, type GroqTool } from '@/lib/groq'

interface EventWithDept {
  id: string
  title: string
  status: string
  event_date: string | null
  venue: string | null
  departments: { name: string }[] | null
}

interface TaskWithDept {
  id: string
  title: string
  status: string
  due_date: string | null
  departments: { name: string }[] | null
  profiles: { full_name: string }[] | null
}

interface MemberWithDetails {
  id: string
  roll_number: string
  year: number
  status: string
  profiles: { full_name: string; email: string }[] | null
  departments: { name: string }[] | null
  roles: { name: string }[] | null
}

interface ProposalWithEvent {
  id: string
  title: string
  status: string
  submitted_at: string
  events: { title: string }[] | null
}

interface AutomationRule {
  id: string
  name: string
  is_active: boolean
  trigger: any
  actions: any
}

export const assistantService = {
  async ask(question: string, userId: string): Promise<string> {
    const context = await this.getContext(question, userId)

    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: `You are the AI Assistant for Technovation OS, a society management platform.
        Work autonomously to inspect and complete authorized society operations.
        Use tools to read live data before answering and use mutation tools only when the user's request clearly requires it.
        Never claim an action succeeded unless a tool returned a successful result.
        Respect role-based permission errors and explain when access is insufficient.
        Be concise, helpful, and reference actual data.`,
      },
      {
        role: 'user',
        content: `Current society context:\n${context}\n\nUser ID: ${userId}\nQuestion: ${question}`,
      },
    ]

    const tools: GroqTool[] = [
      {
        type: 'function',
        function: {
          name: 'list_upcoming_events',
          description: 'List upcoming or active society events',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_tasks',
          description: 'List open tasks and assigned members',
          parameters: {
            type: 'object',
            properties: { status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'blocked', 'all'] } },
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_pending_proposals',
          description: 'List proposals awaiting faculty approval',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a task for an event. Requires HOD or president permission.',
          parameters: {
            type: 'object',
            properties: {
              event_id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              due_days: { type: 'number' },
            },
            required: ['event_id', 'title'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_task_status',
          description: 'Update a task status',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'blocked'] },
            },
            required: ['task_id', 'status'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_notification',
          description: 'Send an in-app notification to a user',
          parameters: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['user_id', 'title', 'message'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_event',
          description: 'Create an event for a department. Members and above may use this.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              department_id: { type: 'string' },
              event_date: { type: 'string' },
              venue: { type: 'string' },
              budget: { type: 'number' },
            },
            required: ['title', 'department_id'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'submit_proposal',
          description: 'Submit a proposal for approval on an existing event.',
          parameters: {
            type: 'object',
            properties: {
              event_id: { type: 'string' },
              title: { type: 'string' },
              objectives: { type: 'string' },
              budget_estimate: { type: 'number' },
              timeline: { type: 'string' },
            },
            required: ['event_id', 'title'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'approve_proposal',
          description: 'Approve or reject a pending proposal. Faculty level or higher required.',
          parameters: {
            type: 'object',
            properties: {
              proposal_id: { type: 'string' },
              decision: { type: 'string', enum: ['approved', 'rejected'] },
              review_comments: { type: 'string' },
            },
            required: ['proposal_id', 'decision'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'assign_task',
          description: 'Assign a task to a member. HOD level or higher required.',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              member_id: { type: 'string' },
            },
            required: ['task_id', 'member_id'],
            additionalProperties: false,
          },
        },
      },
    ]

    return groqAgent(messages, tools, (name, args) => this.executeAgentTool(name, args, userId), 5)
  },

  async executeAgentTool(name: string, args: Record<string, unknown>, userId: string): Promise<unknown> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, roles(level, name)')
      .eq('id', userId)
      .maybeSingle()
    const roleLevel = (profile?.roles as any)?.level || 10

    if (name === 'list_upcoming_events') {
      const { data, error } = await supabase
        .from('events')
        .select('id,title,status,event_date,venue,departments(name)')
        .in('status', ['approved', 'tasks_allocated', 'in_progress'])
        .order('event_date', { ascending: true })
        .limit(10)
      if (error) throw error
      return data
    }

    if (name === 'list_tasks') {
      let query = supabase
        .from('tasks')
        .select('id,title,status,due_date,department_id,assigned_to,departments(name),profiles!tasks_assigned_to_fkey(full_name)')
        .order('due_date', { ascending: true })
        .limit(20)
      if (args.status && args.status !== 'all') query = query.eq('status', String(args.status))
      const { data, error } = await query
      if (error) throw error
      return data
    }

    if (name === 'list_pending_proposals') {
      const { data, error } = await supabase
        .from('proposals')
        .select('id,title,status,budget_estimate,timeline,submitted_at,events(title)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })
        .limit(20)
      if (error) throw error
      return data
    }

    if (name === 'create_task') {
      if (roleLevel < 30) return { error: 'HOD or president permission required' }
      const dueDays = Number(args.due_days || 7)
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          event_id: String(args.event_id),
          title: String(args.title),
          description: String(args.description || ''),
          due_date: new Date(Date.now() + dueDays * 86400000).toISOString(),
          created_by: userId,
          status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      return data
    }

    if (name === 'update_task_status') {
      const taskId = String(args.task_id)
      const { data: task } = await supabase
        .from('tasks')
        .select('assigned_to,created_by')
        .eq('id', taskId)
        .single()
      if (roleLevel < 30 && task?.assigned_to !== userId && task?.created_by !== userId) {
        return { error: 'You cannot update this task' }
      }
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: String(args.status), updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error
      return data
    }

    if (name === 'send_notification') {
      if (roleLevel < 30) return { error: 'HOD or president permission required' }
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: String(args.user_id),
          type: 'agent',
          title: String(args.title),
          message: String(args.message),
          entity_type: 'agent',
        })
        .select()
        .single()
      if (error) throw error
      return data
    }

    if (name === 'create_event') {
      if (roleLevel < 10) return { error: 'A member role or higher is required' }
      const eventDate = args.event_date ? new Date(String(args.event_date)).toISOString() : null
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: String(args.title),
          description: String(args.description || ''),
          department_id: String(args.department_id),
          event_date: eventDate,
          venue: args.venue ? String(args.venue) : null,
          budget: args.budget == null ? null : Number(args.budget),
          created_by: userId,
          status: 'draft',
        })
        .select('*,departments(*)')
        .single()
      if (error) throw error
      await supabase.from('audit_log').insert({
        user_id: userId,
        action: 'agent_create_event',
        entity_type: 'event',
        entity_id: data.id,
        details: { title: data.title },
      })
      return data
    }

    if (name === 'submit_proposal') {
      if (roleLevel < 10) return { error: 'A member role or higher is required' }
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          event_id: String(args.event_id),
          title: String(args.title),
          objectives: args.objectives ? String(args.objectives) : null,
          budget_estimate: args.budget_estimate == null ? null : Number(args.budget_estimate),
          timeline: args.timeline ? String(args.timeline) : null,
          status: 'pending',
          submitted_by: userId,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      await supabase.from('audit_log').insert({
        user_id: userId,
        action: 'agent_submit_proposal',
        entity_type: 'proposal',
        entity_id: data.id,
        details: { event_id: data.event_id, title: data.title },
      })
      return data
    }

    if (name === 'approve_proposal') {
      if (roleLevel < 20) return { error: 'Faculty, HOD, or president permission required' }
      const decision = String(args.decision)
      if (decision !== 'approved' && decision !== 'rejected') {
        return { error: 'Decision must be approved or rejected' }
      }
      const { data, error } = await supabase
        .from('proposals')
        .update({
          status: decision,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_comments: args.review_comments ? String(args.review_comments) : 'Reviewed by autonomous Groq agent',
        })
        .eq('id', String(args.proposal_id))
        .select()
        .single()
      if (error) throw error
      await supabase.from('approvals').insert({
        proposal_id: data.id,
        faculty_id: userId,
        status: decision,
        comments: data.review_comments,
        approved_at: new Date().toISOString(),
      })
      await supabase.from('audit_log').insert({
        user_id: userId,
        action: `agent_${decision}_proposal`,
        entity_type: 'proposal',
        entity_id: data.id,
        details: { event_id: data.event_id, decision },
      })
      return data
    }

    if (name === 'assign_task') {
      if (roleLevel < 30) return { error: 'HOD or president permission required' }
      const taskId = String(args.task_id)
      const memberId = String(args.member_id)
      const { data, error } = await supabase
        .from('tasks')
        .update({ assigned_to: memberId, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error
      await supabase.from('task_assignments').insert({
        task_id: taskId,
        member_id: memberId,
        assigned_by: userId,
        status: 'accepted',
      })
      await supabase.from('audit_log').insert({
        user_id: userId,
        action: 'agent_assign_task',
        entity_type: 'task',
        entity_id: taskId,
        details: { member_id: memberId },
      })
      return data
    }

    return { error: `Unknown tool: ${name}` }
  },

  async getContext(question: string, userId: string): Promise<string> {
    const q = question.toLowerCase()
    const contexts: string[] = []

    if (q.includes('event') || q.includes('upcoming') || q.includes('schedule')) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, status, event_date, venue, departments(name)')
        .in('status', ['approved', 'tasks_allocated', 'in_progress'])
        .order('event_date', { ascending: true })
        .limit(10)
      if (events?.length) {
        contexts.push('Upcoming Events:\n' + events.map((e: any) => `- ${e.title} (${e.departments?.[0]?.name || 'No dept'}) on ${e.event_date ? new Date(e.event_date).toLocaleDateString() : 'TBD'} at ${e.venue || 'TBD'} [${e.status}]`).join('\n'))
      }
    }

    if (q.includes('task') || q.includes('due') || q.includes('overdue') || q.includes('assignment')) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, departments(name), profiles!tasks_assigned_to_fkey(full_name)')
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(10)
      if (tasks?.length) {
        contexts.push('Active Tasks:\n' + tasks.map((t: any) => `- ${t.title} for ${t.departments?.[0]?.name || 'No dept'} assigned to ${t.profiles?.[0]?.full_name || 'Unassigned'} due ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'} [${t.status}]`).join('\n'))
      }
    }

    if (q.includes('member') || q.includes('hod') || q.includes('department') || q.includes('who')) {
      const { data: members } = await supabase
        .from('members')
        .select('id, roll_number, year, status, profiles(full_name, email), departments(name), roles(name)')
        .eq('status', 'active')
        .limit(15)
      if (members?.length) {
        contexts.push('Active Members:\n' + members.map((m: any) => `- ${m.profiles?.[0]?.full_name} (${m.roll_number}) - ${m.departments?.[0]?.name || 'No dept'} - ${m.roles?.[0]?.name || 'member'}`).join('\n'))
      }
    }

    if (q.includes('proposal') || q.includes('approv') || q.includes('pending')) {
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, title, status, submitted_at, events(title)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })
        .limit(10)
      if (proposals?.length) {
        contexts.push('Pending Proposals:\n' + proposals.map((p: any) => `- ${p.title} for ${p.events?.[0]?.title || 'Unknown event'} submitted ${new Date(p.submitted_at).toLocaleDateString()}`).join('\n'))
      }
    }

    if (q.includes('automation') || q.includes('rule') || q.includes('trigger') || q.includes('reminder')) {
      const { data: rules } = await supabase
        .from('automation_rules')
        .select('id, name, is_active, trigger, actions')
        .eq('is_active', true)
        .limit(10)
      if (rules?.length) {
        contexts.push('Active Automation Rules:\n' + rules.map((r: AutomationRule) => `- ${r.name}: ${JSON.stringify(r.trigger)} → ${JSON.stringify(r.actions)}`).join('\n'))
      }
    }

    if (contexts.length === 0) {
      const [eventsCount, tasksCount, membersCount, proposalsCount] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['approved', 'in_progress']),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      contexts.push(`Society Stats: ${eventsCount.count || 0} active events, ${tasksCount.count || 0} open tasks, ${membersCount.count || 0} active members, ${proposalsCount.count || 0} pending proposals`)
    }

    return contexts.join('\n\n')
  },
}