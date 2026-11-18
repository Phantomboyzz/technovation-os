import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { rule_id, trigger_data } = await req.json()

    if (!rule_id) {
      // Time-based trigger: run all active rules
      const { data: rules, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      for (const rule of rules || []) {
        if (rule.trigger.type === 'schedule') {
          await executeRule(supabase, rule, {})
        }
      }

      return new Response(
        JSON.stringify({ message: 'Scheduled automation run complete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Specific rule trigger
    const { data: rule, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', rule_id)
      .single()

    if (error || !rule) throw new Error('Rule not found')

    await executeRule(supabase, rule, trigger_data)

    return new Response(
      JSON.stringify({ message: 'Automation executed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('process-automation error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function executeRule(supabase: any, rule: any, triggerData: any) {
  // Log execution
  const { data: log } = await supabase
    .from('automation_logs')
    .insert({ rule_id: rule.id, trigger_data: triggerData, status: 'pending' })
    .select()
    .single()

  try {
    const results = []

    for (const action of rule.actions) {
      const result = await executeAction(supabase, action, triggerData, rule)
      results.push(result)
    }

    await supabase
      .from('automation_logs')
      .update({ action_result: { results }, status: 'success' })
      .eq('id', log.id)
  } catch (err) {
    await supabase
      .from('automation_logs')
      .update({ action_result: { error: err.message }, status: 'failed' })
      .eq('id', log.id)
  }
}

async function executeAction(supabase: any, action: any, triggerData: any, rule: any) {
  switch (action.type) {
    case 'notify':
      return await sendNotification(supabase, action, triggerData, rule)
    case 'create_task':
      return await createTask(supabase, action, triggerData, rule)
    case 'assign_member':
      return await assignMember(supabase, action, triggerData, rule)
    case 'update_status':
      return await updateStatus(supabase, action, triggerData, rule)
    default:
      return { type: action.type, error: 'Unknown action type' }
  }
}

async function sendNotification(supabase: any, action: any, triggerData: any, rule: any) {
  let userIds: string[] = []

  if (action.to_role) {
    const levelMap: Record<string, number> = { president: 50, vice_president: 40, hod: 30, faculty: 20 }
    const minLevel = levelMap[action.to_role] || 10

    let query = supabase
      .from('profiles')
      .select('id')
      .filter('roles.level', 'gte', minLevel)

    if (action.department) {
      const deptId = resolveTemplate(action.department, triggerData, rule)
      if (deptId) {
        query = query.in('id', supabase.from('members').select('profile_id').eq('department_id', deptId))
      }
    }

    const { data: profiles } = await query
    userIds = profiles?.map((p: any) => p.id) || []
  }

  if (action.to_assignee && triggerData.task?.assigned_to) {
    userIds.push(triggerData.task.assigned_to)
  }

  const notifications = userIds.map((userId: string) => ({
    user_id: userId,
    type: action.type,
    title: resolveTemplate(action.title || 'Notification', triggerData, rule),
    message: resolveTemplate(action.message || '', triggerData, rule),
    entity_type: action.entity_type,
    entity_id: action.entity_id,
  }))

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications)
  }

  return { type: 'notify', count: notifications.length }
}

async function createTask(supabase: any, action: any, triggerData: any, rule: any) {
  const deptId = resolveTemplate(action.department, triggerData, rule)
  const title = resolveTemplate(action.title, triggerData, rule)
  const dueDays = action.due_days || 7

  const { data: task } = await supabase
    .from('tasks')
    .insert({
      event_id: triggerData.proposal?.event_id || triggerData.event?.id,
      department_id: deptId,
      title,
      description: resolveTemplate(action.description || '', triggerData, rule),
      due_date: new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString(),
      created_by: rule.created_by,
    })
    .select()
    .single()

  return { type: 'create_task', task }
}

async function assignMember(supabase: any, action: any, triggerData: any, rule: any) {
  // Simple round-robin or skill-based assignment
  const deptId = resolveTemplate(action.department, triggerData, rule)
  const { data: members } = await supabase
    .from('members')
    .select('profile_id')
    .eq('department_id', deptId)
    .eq('status', 'active')
    .limit(1)

  if (members?.length) {
    const taskId = triggerData.task?.id
    if (taskId) {
      await supabase.from('tasks').update({ assigned_to: members[0].profile_id }).eq('id', taskId)
      return { type: 'assign_member', member_id: members[0].profile_id }
    }
  }
  return { type: 'assign_member', error: 'No eligible members found' }
}

async function updateStatus(supabase: any, action: any, triggerData: any, rule: any) {
  const { data } = await supabase
    .from(action.table || 'events')
    .update({ [action.field]: action.value })
    .eq('id', triggerData.event?.id || triggerData.proposal?.event_id)
    .select()
    .single()
  return { type: 'update_status', data }
}

function resolveTemplate(template: string, triggerData: any, rule: any): string {
  if (!template || typeof template !== 'string') return template
  return template
    .replace(/\{\{proposal\.title\}\}/g, triggerData.proposal?.title || '')
    .replace(/\{\{proposal\.events\.title\}\}/g, triggerData.proposal?.events?.title || '')
    .replace(/\{\{event\.title\}\}/g, triggerData.event?.title || '')
    .replace(/\{\{task\.title\}\}/g, triggerData.task?.title || '')
    .replace(/\{\{task\.due_date\}\}/g, triggerData.task?.due_date || '')
    .replace(/\{\{department_id\}\}/g, triggerData.department_id || '')
}