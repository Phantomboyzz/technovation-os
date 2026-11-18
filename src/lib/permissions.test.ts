import { describe, expect, it } from 'vitest'
import { can, getRoleLevel, getRoleName } from './permissions'

describe('role permissions', () => {
  it('allows members to create events and proposals', () => {
    const profile = {
      roles: { name: 'member', level: 10, permissions: undefined },
    } as any

    expect(getRoleName(profile)).toBe('member')
    expect(getRoleLevel(profile)).toBe(10)
    expect(can(profile, 'events', 'create')).toBe(true)
    expect(can(profile, 'proposals', 'create')).toBe(true)
  })

  it('allows faculty to approve proposals', () => {
    const profile = {
      roles: { name: 'faculty', level: 20, permissions: undefined },
    } as any

    expect(can(profile, 'proposals', 'approve')).toBe(true)
  })

  it('allows HODs to manage tasks', () => {
    const profile = {
      roles: { name: 'hod', level: 30, permissions: undefined },
    } as any

    expect(can(profile, 'tasks', 'create')).toBe(true)
    expect(can(profile, 'tasks', 'assign')).toBe(true)
  })

  it('does not grant member proposal approval', () => {
    const profile = {
      roles: { name: 'member', level: 10, permissions: undefined },
    } as any

    expect(can(profile, 'proposals', 'approve')).toBe(false)
  })
})
