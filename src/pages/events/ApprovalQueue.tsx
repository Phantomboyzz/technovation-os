import { useEffect, useState } from 'react'
import {
  CheckCircle, XCircle, FileText, Clock, Eye, AlertTriangle,
  Sparkles, Loader2, ShieldCheck, UserCheck, Bot
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { isPresident, getRoleName } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { groqChat } from '@/lib/groq'

export default function ApprovalQueue() {
  const { profile } = useAuthStore()
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProposal, setSelectedProposal] = useState<any>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiAuditReport, setAiAuditReport] = useState<any>(null)

  const userRole = getRoleName(profile)
  const isPres = isPresident(profile)

  useEffect(() => {
    loadProposals()
  }, [])

  const loadProposals = async () => {
    try {
      const data = await eventService.getProposals()
      setProposals(data.filter((p: any) => p.status === 'pending'))
    } catch (err) {
      console.error('Failed to load proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  // AI Proposal Audit & Risk Review
  const handleAiAuditProposal = async (proposal: any) => {
    setAiAnalyzing(true)
    setAiAuditReport(null)
    try {
      const prompt = `You are the Executive AI Advisor to the Society President.
Perform an objective audit of this event proposal:
Proposal Title: "${proposal.title}"
Objectives: "${proposal.objectives || 'General college event'}"
Timeline: "${proposal.timeline || 'Not specified'}"
Requested Budget: ₹${proposal.budget_estimate || 0}

Evaluate feasibility, budget sanity, potential risks, and recommend whether the President should Approve or Request Revisions.
Return strict JSON:
{
  "recommendation": "APPROVE" or "NEEDS_REVISION" or "HIGH_RISK",
  "score": 85,
  "summary": "1 concise sentence overview",
  "strengths": ["...", "..."],
  "risks": ["...", "..."],
  "suggested_comment": "Official review remarks ready for the President to submit"
}`

      const res = await groqChat([
        { role: 'system', content: 'You are an institutional audit intelligence tool. Output strict JSON only.' },
        { role: 'user', content: prompt }
      ], { json: true, maxTokens: 600 })

      const parsed = JSON.parse(res)
      setAiAuditReport(parsed)
      if (parsed.suggested_comment && !reviewComment) {
        setReviewComment(parsed.suggested_comment)
      }
    } catch (err) {
      console.error('AI audit error:', err)
      alert('AI Audit could not complete. Check Groq connection.')
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleApprove = async (proposalId: string) => {
    try {
      await eventService.updateProposal(proposalId, {
        status: 'approved',
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        review_comments: reviewComment || (isPres ? 'Executive approval granted by President.' : 'Approved by Faculty.')
      })

      await supabase.from('approvals').insert({
        proposal_id: proposalId,
        faculty_id: profile?.id,
        status: 'approved',
        comments: reviewComment,
        approved_at: new Date().toISOString(),
      })

      const proposal = proposals.find(p => p.id === proposalId)
      if (proposal?.event_id) {
        await eventService.updateEvent(proposal.event_id, { status: 'approved' })
      }

      // Notify submitter of approval
      if (proposal?.submitted_by) {
        await supabase.from('notifications').insert({
          user_id: proposal.submitted_by,
          title: '✅ Proposal Approved by President!',
          message: `Your proposal "${proposal.title}" has been formally approved! Execution tasks can now be scheduled.`,
          type: 'approval',
          entity_type: 'events',
          entity_id: proposal.event_id,
        })
      }

      setProposals(proposals.filter(p => p.id !== proposalId))
      setSelectedProposal(null)
      setReviewComment('')
      setAiAuditReport(null)
      alert('Proposal approved successfully!')
    } catch (err) {
      console.error('Failed to approve:', err)
      alert('Approval action failed.')
    }
  }

  const handleReject = async (proposalId: string) => {
    try {
      await eventService.updateProposal(proposalId, {
        status: 'rejected',
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        review_comments: reviewComment || 'Returned for revisions by executive committee.'
      })

      const proposal = proposals.find(p => p.id === proposalId)
      if (proposal?.submitted_by) {
        await supabase.from('notifications').insert({
          user_id: proposal.submitted_by,
          title: '⚠️ Proposal Revision Requested',
          message: `Your proposal "${proposal.title}" requires revisions: "${reviewComment || 'Please adjust the scope or budget.'}"`,
          type: 'rejection',
          entity_type: 'events',
          entity_id: proposal.event_id,
        })
      }

      setProposals(proposals.filter(p => p.id !== proposalId))
      setSelectedProposal(null)
      setReviewComment('')
      setAiAuditReport(null)
      alert('Proposal marked as rejected/needs revision.')
    } catch (err) {
      console.error('Failed to reject:', err)
    }
  }

  const openReview = (proposal: any) => {
    setSelectedProposal(proposal)
    setReviewComment('')
    setAiAuditReport(null)
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading approvals..." />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Executive Approval Queue</h1>
          <p className="page-subtitle">President & Faculty approval portal with AI feasibility audit</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-purple text-xs flex items-center gap-1.5 py-1 px-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Signed in as: <strong className="capitalize">{userRole.replace('_', ' ')}</strong>
          </span>
        </div>
      </div>

      {proposals.length === 0 ? (
        <GlassCard className="text-center py-16">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-60" />
          <h3 className="text-lg font-medium mb-1">Queue is clear!</h3>
          <p className="text-muted text-sm">No proposals are currently awaiting executive approval.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {proposals.map(proposal => (
            <div
              key={proposal.id}
              onClick={() => openReview(proposal)}
              className="glass-card-hover p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="badge badge-amber text-xs font-semibold">Pending Approval</span>
                  <h3 className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>
                    {proposal.title}
                  </h3>
                </div>
                <p className="text-xs text-muted mb-2 line-clamp-1">{proposal.objectives || 'No objectives stated'}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>📅 Submitted: {formatDate(proposal.submitted_at)}</span>
                  {proposal.budget_estimate && (
                    <span className="text-emerald-400 font-semibold">₹{proposal.budget_estimate.toLocaleString()} Budget</span>
                  )}
                  {proposal.timeline && <span>⏱️ {proposal.timeline}</span>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openReview(proposal); }}
                className="btn-secondary text-xs py-2 px-3 self-end sm:self-center"
              >
                <Eye className="w-3.5 h-3.5" />
                Review & Audit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Review & AI Audit Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto border shadow-glass" style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Executive Review & Decision
                </h2>
                <p className="text-xs text-muted">Authorized approval gates for society events</p>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted">✕</button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Proposal summary card */}
              <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }}>
                <h4 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {selectedProposal.title}
                </h4>
                {selectedProposal.objectives && (
                  <p className="text-xs text-muted whitespace-pre-line mb-3 leading-relaxed">
                    {selectedProposal.objectives}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-muted block">Estimated Budget</span>
                    <span className="font-semibold text-emerald-400 text-sm">
                      ₹{selectedProposal.budget_estimate?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block">Execution Timeline</span>
                    <span className="font-semibold text-foreground">
                      {selectedProposal.timeline || 'Flexible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Audit Action */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-purple-500/30" style={{ background: 'rgba(139,92,246,0.06)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-400">AI President Advisor</p>
                    <p className="text-[11px] text-muted">Audit financial feasibility & risk before approving</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAiAuditProposal(selectedProposal)}
                  disabled={aiAnalyzing}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                >
                  {aiAnalyzing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Auditing...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Run AI Audit</>
                  )}
                </button>
              </div>

              {/* AI Audit Report Result */}
              {aiAuditReport && (
                <div className="rounded-xl p-3.5 border border-purple-500/30 space-y-2 animate-fade-in" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted">Audit Score: {aiAuditReport.score}/100</span>
                    <span className={cn('badge text-xs font-bold',
                      aiAuditReport.recommendation === 'APPROVE' ? 'badge-green' : 'badge-amber'
                    )}>
                      Recommendation: {aiAuditReport.recommendation}
                    </span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    "{aiAuditReport.summary}"
                  </p>
                  {aiAuditReport.risks?.length > 0 && (
                    <div className="text-[11px] text-amber-300">
                      ⚠️ Risks identified: {aiAuditReport.risks.join(' · ')}
                    </div>
                  )}
                </div>
              )}

              {/* President Review Comments */}
              <div>
                <label className="label">President / Faculty Review Comments</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="input min-h-[90px] text-xs resize-y"
                  placeholder="State authorization notes, budget conditions, or revision instructions..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => handleReject(selectedProposal.id)}
                  className="btn-danger text-xs py-2 px-4"
                >
                  <XCircle className="w-4 h-4" />
                  Decline / Request Revision
                </button>
                <button
                  onClick={() => handleApprove(selectedProposal.id)}
                  className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 shadow-glow-green"
                >
                  <CheckCircle className="w-4 h-4" />
                  Grant Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
