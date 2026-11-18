import { supabase } from '@/lib/supabase'
import type { AutomationRule, AutomationLog } from '@/types/schema'

export const automationService = {
  async getRules(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createRule(rule: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data, error } = await supabase.from('automation_rules').insert(rule).select().single()
    if (error) throw error
    return data
  },

  async updateRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data, error } = await supabase
      .from('automation_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id)
    if (error) throw error
  },

  async getLogs(ruleId?: string): Promise<AutomationLog[]> {
    let query = supabase
      .from('automation_logs')
      .select('*, automation_rules(name)')
      .order('executed_at', { ascending: false })
      .limit(50)
    if (ruleId) query = query.eq('rule_id', ruleId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async triggerAutomation(ruleId: string, triggerData: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke('process-automation', {
      body: { rule_id: ruleId, trigger_data: triggerData },
    })
    if (error) throw error
    return data
  },
}