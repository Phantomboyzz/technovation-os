import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/schema'

interface AuthState {
  user: any | null
  profile: Profile | null
  loading: boolean
  error: string | null
  setUser: (user: any | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signOut: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      loading: true,
      error: null,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      signOut: () => set({ user: null, profile: null, error: null }),
      reset: () => set({ user: null, profile: null, loading: false, error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
)