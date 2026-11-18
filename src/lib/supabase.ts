import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key'

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  },
  realtime: {
    params: { events: true, broadcasts: true },
  },
})

// Helper: get current user id
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Helper: get current user profile
export async function getCurrentProfile() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*, roles(name, level, permissions)')
    .eq('id', userId)
    .single()
  if (error) {
    // Don't throw for PGRST116 (no rows returned) - profile might not exist yet
    if (error.code === 'PGRST116') return null
    console.error('getCurrentProfile error:', error)
    throw error
  }
  return data
}

// Helper: check if user has permission
export function hasPermission(
  profile: any,
  resource: string,
  action: string
): boolean {
  if (!profile?.roles?.permissions) return false
  const perms = profile.roles.permissions as any[]
  const res = perms.find((p: any) => p.resource === resource)
  if (!res) return false
  return res.actions.includes(action) || res.actions.includes('all')
}

export default supabase