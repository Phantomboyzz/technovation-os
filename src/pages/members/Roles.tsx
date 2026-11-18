import { useEffect, useState } from 'react'
import { Shield, Edit, Trash2, Plus, Users, Save, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'

const DEFAULT_PERMISSIONS = [
  { resource: 'members', actions: ['read'] },
  { resource: 'departments', actions: ['read'] },
  { resource: 'events', actions: ['read'] },
  { resource: 'proposals', actions: ['read'] },
  { resource: 'tasks', actions: ['read'] },
  { resource: 'automations', actions: [] },
  { resource: 'roles', actions: [] },
  { resource: 'settings', actions: [] },
  { resource: 'assistant', actions: ['read'] },
]

export default function Roles() {
  const { profile } = useAuthStore()
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 10,
    description: '',
    permissions: DEFAULT_PERMISSIONS,
  })

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase.from('roles').select('*').order('level', { ascending: false })
      if (error) throw error
      setRoles(data || [])
    } catch (err) {
      console.error('Failed to load roles:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingRole) {
        await supabase.from('roles').update({ ...formData, permissions: formData.permissions }).eq('id', editingRole.id)
      } else {
        await supabase.from('roles').insert({ ...formData, permissions: formData.permissions })
      }
      loadRoles()
      setShowForm(false)
      setEditingRole(null)
      setFormData({ name: '', level: 10, description: '', permissions: DEFAULT_PERMISSIONS })
    } catch (err) {
      console.error('Failed to save role:', err)
    }
  }

  const handleEdit = (role: any) => {
    setEditingRole(role)
    setFormData({ ...role, permissions: role.permissions || DEFAULT_PERMISSIONS })
    setShowForm(true)
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('Delete this role?')) return
    try {
      await supabase.from('roles').delete().eq('id', roleId)
      loadRoles()
    } catch (err) {
      console.error('Failed to delete role:', err)
    }
  }

  const togglePermission = (resource: string, action: string) => {
    const newPermissions = formData.permissions.map((p: any) => {
      if (p.resource === resource) {
        const hasAction = p.actions.includes(action)
        return {
          ...p,
          actions: hasAction
            ? p.actions.filter((a: string) => a !== action)
            : [...p.actions, action],
        }
      }
      return p
    })
    setFormData(prev => ({ ...prev, permissions: newPermissions }))
  }

  const hasPermission = (resource: string, action: string) => {
    return formData.permissions.find((p: any) => p.resource === resource)?.actions.includes(action) || false
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading roles..." />

  const resources = [
    'members', 'departments', 'events', 'proposals', 'tasks', 'automations', 'roles', 'settings', 'assistant'
  ]
  const actions = ['create', 'read', 'update', 'delete', 'assign', 'approve']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Roles & Permissions</h1>
          <p className="text-muted mt-1">Manage role definitions and access control</p>
        </div>
        <button onClick={() => { setEditingRole(null); setFormData({ name: '', level: 10, description: '', permissions: DEFAULT_PERMISSIONS }); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Role
        </button>
      </div>

      <div className="space-y-4">
        {roles.map(role => (
          <GlassCard key={role.id} hover>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{role.name}</h3>
                    <span className="badge-purple">Level {role.level}</span>
                  </div>
                  <p className="text-sm text-muted">{role.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(role)} className="p-2 glass rounded hover:bg-white/5"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(role.id)} className="p-2 glass rounded hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold">{editingRole ? 'Edit Role' : 'New Role'}</h2>
              <button onClick={() => { setShowForm(false); setEditingRole(null); setFormData({ name: '', level: 10, description: '', permissions: DEFAULT_PERMISSIONS }) }} className="p-2 glass rounded-xl hover:bg-white/5">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input" required />
                </div>
                <div>
                  <label className="label">Level (10-50)</label>
                  <input type="number" value={formData.level} onChange={e => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))} className="input" min="10" max="50" required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input type="text" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h4 className="font-medium mb-4">Permissions Matrix</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-white/10">
                        <th className="pb-2 font-medium">Resource</th>
                        {actions.map(action => (
                          <th key={action} className="pb-2 text-center font-medium capitalize">{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map(resource => (
                        <tr key={resource} className="border-b border-white/5">
                          <td className="py-3 font-medium capitalize">{resource}</td>
                          {actions.map(action => (
                            <td key={action} className="py-3 text-center">
                              <input
                                type="checkbox"
                                checked={hasPermission(resource, action)}
                                onChange={() => togglePermission(resource, action)}
                                className="w-4 h-4 accent-purple"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => { setShowForm(false); setEditingRole(null); setFormData({ name: '', level: 10, description: '', permissions: DEFAULT_PERMISSIONS }) }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingRole ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

