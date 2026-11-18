import { create } from 'zustand'
import type { Department, Member } from '@/types/schema'

interface MemberState {
  departments: Department[]
  members: Member[]
  setDepartments: (depts: Department[]) => void
  setMembers: (members: Member[]) => void
  addMember: (m: Member) => void
  updateMember: (id: string, updates: Partial<Member>) => void
  reset: () => void
}

export const useMemberStore = create<MemberState>()((set) => ({
  departments: [],
  members: [],
  setDepartments: (departments) => set({ departments }),
  setMembers: (members) => set({ members }),
  addMember: (m) => set((s) => ({ members: [...s.members, m] })),
  updateMember: (id, updates) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  reset: () => set({ departments: [], members: [] }),
}))