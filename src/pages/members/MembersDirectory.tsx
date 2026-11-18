import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Users, Mail, Phone, Building2, ChevronRight, Edit, Trash2, Sparkles, Loader2, Bot } from 'lucide-react'
import { useMemberStore } from '@/store/memberStore'
import { useAuthStore } from '@/store/authStore'
import { memberService } from '@/services/memberService'
import { GlassCard } from '@/components/common'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can, getRoleName, isPresident, isFaculty } from '@/lib/permissions'
import { groqChat } from '@/lib/groq'

export default function MembersDirectory() {
  const { members, setMembers, departments, setDepartments } = useMemberStore()
  const { profile } = useAuthStore()
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  // AI Member Skill Profiling State
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [aiProfiling, setAiProfiling] = useState(false)
  const [skillProfile, setSkillProfile] = useState<any>(null)

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
  const isPrivileged = isPresident(profile) || isFaculty(profile)

  const handleProfileMemberWithAi = async (member: any) => {
    setSelectedMember(member)
    setAiProfiling(true)
    setSkillProfile(null)
    try {
      const prompt = `Analyze this college student society member and generate an operational skill card:
Name: ${member.profiles?.full_name || 'Member'}
Department: ${member.departments?.name || 'General Operations'}
Role: ${member.profiles?.roles?.name || 'Member'}
Academic Year: Year ${member.year || 2}

Generate strict JSON:
{
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
  "best_fit_tasks": ["Task A", "Task B"],
  "operational_readiness": "High"
}`

      const res = await groqChat([
        { role: 'system', content: 'You are an operations talent profiler for collegiate societies. Output strict JSON only.' },
        { role: 'user', content: prompt }
      ], { json: true, maxTokens: 400 })

      setSkillProfile(JSON.parse(res))
    } catch (e) {
      console.error('AI Profile error:', e)
    } finally {
      setAiProfiling(false)
    }
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading members..." />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Members Directory</h1>
          <p className="page-subtitle">Society team directory with AI member skill mapping</p>
        </div>
        {canManage && (
          <button className="btn-primary text-sm py-2" onClick={() => alert('Add Member: New members join via registration with default member role.')}>
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Filters */}
      <GlassCard padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-11 text-sm py-2.5"
            />
          </div>
          <div className="flex gap-2">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input w-auto text-sm py-2">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-sm py-2">
              <option value="active">Active Members</option>
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
            <h3 className="text-lg font-medium mb-1">No members found</h3>
            <p className="text-muted text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          filteredMembers.map(member => (
            <GlassCard key={member.id} className="flex flex-col justify-between p-4 sm:p-5">
              <div>
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center font-bold text-white text-base shadow-sm flex-shrink-0">
                    {getInitials(member.profiles?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {member.profiles?.full_name || 'Member'}
                    </h3>
                    <p className="text-xs text-muted truncate">{member.profiles?.email}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs mb-3.5">
                  {member.roll_number && (
                    <div className="flex items-center gap-2 text-muted">
                      <span>🎓</span>
                      <span className="font-mono text-[11px]">{member.roll_number}</span>
                    </div>
                  )}
                  {member.departments?.name && (
                    <div className="flex items-center gap-2 text-muted">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="badge-blue text-[10px] px-2 py-0.5 rounded-md font-medium">{member.departments.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted">
                    <span>👤</span>
                    <span className="capitalize font-medium text-foreground">{member.profiles?.roles?.name || 'Member'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <span className={cn('badge text-[10px]',
                  member.status === 'active' ? 'badge-green' :
                  member.status === 'inactive' ? 'badge-slate' : 'badge-amber'
                )}>
                  {member.status}
                </span>

                <button
                  onClick={() => handleProfileMemberWithAi(member)}
                  className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 p-1 hover:bg-purple-500/10 rounded-md transition-colors"
                  title="View AI skill analysis for task allocation"
                >
                  <Sparkles className="w-3 h-3" />
                  Skill Card
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* AI Member Skill Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md border shadow-glass" style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between pb-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {selectedMember.profiles?.full_name}'s AI Skill Profile
                  </h3>
                  <p className="text-[11px] text-muted">{selectedMember.departments?.name || 'General'} Department</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-1 rounded-lg hover:bg-white/10 text-muted">✕</button>
            </div>

            <div className="py-4 space-y-3.5">
              {aiProfiling ? (
                <div className="py-10 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p className="text-xs text-muted">Profiling competencies & optimal task alignment...</p>
                </div>
              ) : skillProfile ? (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                      Core Competencies
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {skillProfile.skills?.map((s: string, i: number) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
                      Best-Fit Society Deliverables
                    </span>
                    <ul className="space-y-1 text-xs text-secondary list-disc pl-4">
                      {skillProfile.best_fit_tasks?.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <span>Task Execution Readiness:</span>
                    <span className="font-bold">{skillProfile.operational_readiness || 'High'}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-2 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setSelectedMember(null)} className="btn-secondary text-xs py-1.5 px-3">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
