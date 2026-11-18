import { supabase } from '@/lib/supabase'
import type { Department, Member, Profile } from '@/types/schema'

export const memberService = {
  async getDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('*, profiles(full_name, avatar_url)')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getDepartment(id: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createDepartment(dept: Partial<Department>): Promise<Department> {
    const { data, error } = await supabase.from('departments').insert(dept).select().single()
    if (error) throw error
    return data
  },

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getMembers(departmentId?: string | null): Promise<Member[]> {
    let query = supabase
      .from('members')
      .select('*, profiles(*, roles(*)), departments(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (departmentId) query = query.eq('department_id', departmentId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getMember(id: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*, profiles(*, roles(*)), departments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getMemberByProfileId(profileId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*, profiles(*, roles(*)), departments(*)')
      .eq('profile_id', profileId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    const { data, error } = await supabase.from('members').insert(member).select().single()
    if (error) throw error
    return data
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, roles(*)')
      .order('full_name')
    if (error) throw error
    return data || []
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}