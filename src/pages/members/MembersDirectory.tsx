import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Users, Mail, Phone, Building2, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { useMemberStore } from '@/store/memberStore'
import { useAuthStore } from '@/store/authStore'
import { memberService } from '@/services/memberService'
import { GlassCard } from '@/components/common'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can, getRoleName } from '@/lib/permissions'

export default function MembersDirectory() {
  const { members, setMembers, departments, setDepartments } = useMemberStore()
  const { profile } = useAuthStore()
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [membersData, deptsData] = await Promise.all([
        memberService.getMembers(),
        memberService.getDepartments(),
      ])
      setMembers(membersData)
      setDepartments(deptsData)
    } catch (err) {
      console.error('Failed to load members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = members
    if (search) {
      result = result.filter(m =>
        m.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.roll_number?.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (deptFilter !== 'all') {
      result = result.filter(m => m.department_id === deptFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter)
    }
    setFilteredMembers(result)
  }, [members, search, deptFilter, statusFilter])

  const role = getRoleName(profile)
  const canManage = can(profile, 'members', 'create')

  if (loading) return <LoadingSpinner size="lg" message="Loading members..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Members Directory</h1>
          <p className="text-muted mt-1">Manage society members</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => alert('Create member modal - TODO')}>
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Filters */}
      <GlassCard padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-12"
            />
          </div>
          <div className="flex gap-2">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input w-auto">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full glass-card text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No members found</h3>
            <p className="text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          filteredMembers.map(member => (
            <GlassCard key={member.id} className="flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center font-semibold text-white text-lg">
                  {getInitials(member.profiles?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{member.profiles?.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted truncate">{member.profiles?.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {member.roll_number && (
                  <div className="flex items-center gap-2 text-muted">
                    <span className="w-4 h-4">🎓</span>
                    <span>{member.roll_number}</span>
                  </div>
                )}
                {member.departments?.name && (
                  <div className="flex items-center gap-2 text-muted">
                    <Building2 className="w-4 h-4" />
                    <span className="badge-blue text-xs">{member.departments.name}</span>
                  </div>
                )}
                {member.year && (
                  <div className="flex items-center gap-2 text-muted">
                    <span className="w-4 h-4">📅</span>
                    <span>Year {member.year}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted">
                  <span className="w-4 h-4">👤</span>
                  <span className="capitalize">{member.profiles?.roles?.name || 'member'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className={cn('badge text-xs',
                  member.status === 'active' ? 'badge-green' :
                  member.status === 'inactive' ? 'badge-slate' : 'badge-amber'
                )}>
                  {member.status}
                </span>
                <div className="flex items-center gap-1">
                  {can(profile, 'members', 'update') && (
                    <button className="p-2 glass rounded-xl hover:bg-white/5" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  )
}

