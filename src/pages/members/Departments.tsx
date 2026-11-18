import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Users, Building2, Save, X } from 'lucide-react'
import { useMemberStore } from '@/store/memberStore'
import { useAuthStore } from '@/store/authStore'
import { memberService } from '@/services/memberService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, getInitials } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'

export default function Departments() {
  const { departments, setDepartments, members } = useMemberStore()
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', description: '', hod_id: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const depts = await memberService.getDepartments()
      setDepartments(depts)
    } catch (err) {
      console.error('Failed to load departments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingDept) {
        await memberService.updateDepartment(editingDept.id, formData)
      } else {
        await memberService.createDepartment(formData)
      }
      loadData()
      setShowForm(false)
      setEditingDept(null)
      setFormData({ name: '', description: '', hod_id: '' })
    } catch (err) {
      console.error('Failed to save department:', err)
    }
  }

  const handleEdit = (dept: any) => {
    setEditingDept(dept)
    setFormData({ name: dept.name, description: dept.description || '', hod_id: dept.hod_id || '' })
    setShowForm(true)
  }

  const handleDelete = async (deptId: string) => {
    if (!confirm('Delete this department?')) return
    // Need delete mutation
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading departments..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Departments</h1>
          <p className="text-muted mt-1">Manage society departments & HODs</p>
        </div>
        <button onClick={() => { setEditingDept(null); setFormData({ name: '', description: '', hod_id: '' }); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => {
          const hod = dept.hod_id ? members.find(m => m.profile_id === dept.hod_id) : null
          const memberCount = members.filter(m => m.department_id === dept.id).length
          return (
            <GlassCard key={dept.id} hover>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(dept)} className="p-2 glass rounded hover:bg-white/5"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(dept.id)} className="p-2 glass rounded hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">{dept.name}</h3>
              <p className="text-sm text-muted mb-4">{dept.description || 'No description'}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Users className="w-4 h-4" />
                  <span>{memberCount} members</span>
                </div>
                {hod && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white text-sm">
                      {getInitials(hod.profiles?.full_name)}
                    </div>
                    <span className="text-muted">HOD: {hod.profiles?.full_name}</span>
                  </div>
                )}
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold">{editingDept ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={() => { setShowForm(false); setEditingDept(null); setFormData({ name: '', description: '', hod_id: '' }) }} className="p-2 glass rounded-xl hover:bg-white/5">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="input min-h-[80px] resize-y" />
              </div>
              <div>
                <label className="label">HOD</label>
                <select value={formData.hod_id} onChange={e => setFormData(prev => ({ ...prev, hod_id: e.target.value }))} className="input">
                  <option value="">Select HOD</option>
                  {members.filter(m => m.profiles?.roles?.name === 'hod').map(m => (
                    <option key={m.profile_id} value={m.profile_id}>{m.profiles?.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingDept(null); setFormData({ name: '', description: '', hod_id: '' }) }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingDept ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

