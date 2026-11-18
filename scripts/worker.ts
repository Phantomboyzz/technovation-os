#!/usr/bin/env tsx
/**
 * Automation Worker - Fallback Polling for Localhost
 *
 * This worker runs on localhost to trigger automation rules
 * when Supabase pg_cron/webhooks aren't available.
 * On deployed Supabase, pg_cron handles scheduled triggers.
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const POLL_INTERVAL = parseInt(process.env.AUTOMATION_POLL_INTERVAL || '60000', 10)

console.log(`🤖 Automation Worker starting...`)
console.log(`   Supabase: ${SUPABASE_URL}`)
console.log(`   Poll interval: ${POLL_INTERVAL}ms`)

async function runScheduledAutomations() {
  try {
    // Get all active schedule-based rules
    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('is_active', true)
      .eq('trigger->>type', 'schedule')

    if (error) throw error

    for (const rule of rules || []) {
      if (!shouldRunNow(rule.trigger)) continue

      console.log(`⚡ Executing scheduled rule: ${rule.name}`)
      await executeRule(rule)
    }

  } catch (err) {
    console.error('Scheduled automation error:', err)
  }
}

async function runTaskReminders() {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id,title,due_date,assigned_to')
    .neq('status', 'completed')
    .not('assigned_to', 'is', null)
    .lte('due_date', soon)

  if (error) throw error

  for (const task of tasks || []) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('entity_type', 'task')
      .eq('entity_id', task.id)
      .gte('created_at', cutoff)
      .limit(1)

    if (existing?.length) continue

    await supabase.from('notifications').insert({
      user_id: task.assigned_to,
      type: 'reminder',
      title: 'Task due soon',
      message: `"${task.title}" is due ${task.due_date ? new Date(task.due_date).toLocaleString() : 'soon'}.`,
      entity_type: 'task',
      entity_id: task.id,
    })
  }
}

async function runDatabaseAutomations() {
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id,title,status,event_id,submitted_at,reviewed_at')
    .eq('status', 'approved')

  if (error) throw error

  for (const proposal of proposals || []) {
    const { data: existing } = await supabase
      .from('automation_logs')
      .select('id')
      .contains('trigger_data', { proposal_id: proposal.id, status: 'approved' })
      .limit(1)

    if (existing?.length) continue

    await supabase
      .from('automation_logs')
      .insert({
        rule_id: null,
        trigger_data: { proposal_id: proposal.id, status: 'approved' },
        action_result: { workflow: 'proposal_approved', event_id: proposal.event_id },
        status: 'success',
      })
  }
}

function shouldRunNow(trigger: any): boolean {
  if (!trigger.cron) return false
  // Simple cron matching - in production use a proper cron parser
  // For demo: run every minute if cron is "* * * * *"
  return trigger.cron === '* * * * *' || trigger.cron === '0 * * * *'
}

async function executeRule(rule: any) {
  // Log execution
  const { data: log, error: logError } = await supabase
    .from('automation_logs')
    .insert({ rule_id: rule.id, trigger_data: { scheduled: true }, status: 'pending' })
    .select()
    .single()

  if (logError) throw logError

  try {
    const results = []

    for (const action of rule.actions) {
      const result = await executeAction(action, rule)
      results.push(result)
    }

    await supabase
      .from('automation_logs')
      .update({ action_result: { results }, status: 'success', executed_at: new Date().toISOString() })
      .eq('id', log.id)

    console.log(`   ✅ Rule "${rule.name}" executed successfully`)
  } catch (err) {
    await supabase
      .from('automation_logs')
      .update({ action_result: { error: err instanceof Error ? err.message : 'Unknown' }, status: 'failed', executed_at: new Date().toISOString() })
      .eq('id', log.id)
    console.error(`   ❌ Rule "${rule.name}" failed:`, err)
  }
}

async function executeAction(action: any, rule: any) {
  switch (action.type) {
    case 'notify':
      return await sendNotification(action, rule)
    case 'create_task':
      return await createTask(action, rule)
    case 'update_status':
      return await updateStatus(action, rule)
    default:
      return { type: action.type, error: 'Unknown action type' }
  }
}

async function sendNotification(action: any, rule: any) {
  let userIds: string[] = []

  if (action.to_role) {
    const levelMap: Record<string, number> = { president: 50, vice_president: 40, hod: 30, faculty: 20 }
    const minLevel = levelMap[action.to_role] || 10

    let query = supabase
      .from('profiles')
      .select('id, roles!inner(level)')
      .gte('roles.level', minLevel)

    if (action.department) {
      const deptId = action.department
      if (deptId) {
        const { data: members } = await supabase
          .from('members')
          .select('profile_id')
          .eq('department_id', deptId)
        if (members) {
          userIds = members.map(m => m.profile_id)
        }
      }
    } else {
      const { data: profiles } = await query
      userIds = profiles?.map((p: any) => p.id) || []
    }
  }

  const notifications = userIds.map(userId => ({
    user_id: userId,
    type: 'automation',
    title: action.title || 'Automation Notification',
    message: action.message || '',
    entity_type: 'automation_rule',
    entity_id: rule.id,
  }))

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications)
  }

  return { type: 'notify', count: notifications.length }
}

async function createTask(action: any, rule: any) {
  const deptId = action.department
  const title = action.title
  const dueDays = action.due_days || 7

  const { data: task } = await supabase
    .from('tasks')
    .insert({
      department_id: deptId,
      title,
      description: action.description || '',
      due_date: new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString(),
      created_by: rule.created_by,
    })
    .select()
    .single()

  return { type: 'create_task', task }
}

async function updateStatus(action: any, rule: any) {
  const { data } = await supabase
    .from(action.table || 'events')
    .update({ [action.field]: action.value })
    .eq('id', action.entity_id)
    .select()
    .single()
  return { type: 'update_status', data }
}

// Main loop
async function main() {
  console.log('🔄 Starting automation polling loop...')

  const poll = async () => {
    const jobs = [runScheduledAutomations(), runTaskReminders(), runDatabaseAutomations()]
    const results = await Promise.allSettled(jobs)
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Automation polling error:', result.reason)
      }
    }
  }

  // Initial run
  await poll()

  // Polling loop
  setInterval(poll, POLL_INTERVAL)
}

main().catch(err => {
  console.error('Worker fatal error:', err)
  process.exit(1)
})