import type { Profile, Permission } from '@/types/schema'

// Default permissions per role level
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  president: [
    { resource: 'members', actions: ['create', 'read', 'update', 'delete', 'assign'] },
    { resource: 'departments', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'events', actions: ['create', 'read', 'update', 'delete', 'approve'] },
    { resource: 'proposals', actions: ['create', 'read', 'update', 'delete', 'approve'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete', 'assign'] },
    { resource: 'automations', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'roles', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'assistant', actions: ['read'] },
  ],
  vice_president: [
    { resource: 'members', actions: ['read', 'update'] },
    { resource: 'departments', actions: ['read'] },
    { resource: 'events', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'proposals', actions: ['create', 'read', 'update', 'approve'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete', 'assign'] },
    { resource: 'automations', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'assistant', actions: ['read'] },
  ],
  hod: [
    { resource: 'members', actions: ['read', 'update'] },
    { resource: 'departments', actions: ['read'] },
    { resource: 'events', actions: ['create', 'read', 'update'] },
    { resource: 'proposals', actions: ['create', 'read', 'update'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
    { resource: 'automations', actions: ['read'] },
    { resource: 'assistant', actions: ['read'] },
  ],
  faculty: [
    { resource: 'members', actions: ['read'] },
    { resource: 'departments', actions: ['read'] },
    { resource: 'events', actions: ['read'] },
    { resource: 'proposals', actions: ['read', 'approve'] },
    { resource: 'tasks', actions: ['read', 'assign'] },
    { resource: 'automations', actions: ['read'] },
    { resource: 'assistant', actions: ['read'] },
  ],
  member: [
    { resource: 'members', actions: ['read'] },
    { resource: 'departments', actions: ['read'] },
    { resource: 'events', actions: ['read', 'create'] },
    { resource: 'proposals', actions: ['read', 'create'] },
    { resource: 'tasks', actions: ['read', 'update'] },
    { resource: 'automations', actions: [] },
    { resource: 'assistant', actions: ['read'] },
  ],
}

export function getRoleName(profile: Profile | null): string {
  if (!profile?.roles?.name) return 'member'
  return profile.roles.name
}

export function getRoleLevel(profile: Profile | null): number {
  return profile?.roles?.level ?? 10
}

export function can(profile: Profile | null, resource: string, action: string): boolean {
  if (!profile) return false
  const perms: Permission[] = profile.roles?.permissions || ROLE_PERMISSIONS[getRoleName(profile)] || []
  const res = perms.find((p) => p.resource === resource)
  if (!res) return false
  return res.actions.includes(action) || res.actions.includes('all')
}

export function canApprove(profile: Profile | null): boolean {
  return can(profile, 'proposals', 'approve')
}

export function canAssign(profile: Profile | null): boolean {
  return can(profile, 'tasks', 'assign')
}

export function canCreateEvent(profile: Profile | null): boolean {
  return can(profile, 'events', 'create')
}

export function canManageAutomations(profile: Profile | null): boolean {
  return can(profile, 'automations', 'create')
}

export function canManageRoles(profile: Profile | null): boolean {
  return can(profile, 'roles', 'create')
}

export function isPresident(profile: Profile | null): boolean {
  return getRoleName(profile) === 'president'
}

export function isHOD(profile: Profile | null): boolean {
  return getRoleName(profile) === 'hod'
}

export function isFaculty(profile: Profile | null): boolean {
  return getRoleName(profile) === 'faculty'
}

export function isMember(profile: Profile | null): boolean {
  return getRoleName(profile) === 'member'
}

export function canViewAllDepartments(profile: Profile | null): boolean {
  const level = getRoleLevel(profile)
  return level >= 30
}