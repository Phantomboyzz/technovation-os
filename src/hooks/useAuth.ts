import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase, getCurrentUserId, getCurrentProfile } from '@/lib/supabase'
import type { Profile } from '@/types/schema'

export function useAuth() {
  const { user, profile, loading, error, setUser, setProfile, setLoading, setError, signOut, reset } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined

    async function init() {
      try {
        setLoading(true)
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
          fallbackTimer = setTimeout(() => resolve({ data: { session: null } }), 3000)
        })
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
        if (session?.user && mounted) {
          setUser(session.user)
          const profileData = await getCurrentProfile()
          if (mounted) setProfile(profileData)
        }
      } catch (err: any) {
        if (mounted) setError(err.message)
      } finally {
        if (fallbackTimer) clearTimeout(fallbackTimer)
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          const profileData = await getCurrentProfile()
          setProfile(profileData)
        } else if (event === 'SIGNED_OUT') {
          reset()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setProfile, setLoading, setError, reset])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) {
        setUser(data.user)
        const profileData = await getCurrentProfile()
        setProfile(profileData)
      }
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const signup = async (email: string, password: string, fullName: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      return { success: true, needsConfirmation: !data.session }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    signOut()
  }

  return {
    user,
    profile,
    loading,
    error,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  }
}

export function useRequireAuth() {
  const auth = useAuth()
  return auth
}