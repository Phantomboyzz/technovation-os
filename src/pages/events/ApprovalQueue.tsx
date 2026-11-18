import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, FileText, Clock, Eye, AlertTriangle } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { useAuthStore } from '@/store/authStore'
import { eventService } from '@/services/eventService'
import { GlassCard, GlassCardHeader } from '@/components/common'
import { cn, formatDate, getEventStatusColor, getEventStatusLabel } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'

export default function ApprovalQueue() {
  const { profile } = useAuthStore()
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProposal, setSelectedProposal] = useState<any>(null)
  const [reviewComment, setReviewComment] = useState('')

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

  const handleApprove = async (proposalId: string) => {
    try {
      await import('@/services/eventService').then(m =>
        m.eventService.updateProposal(proposalId, {
          status: 'approved',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComment
        })
      )
      await supabase.from('approvals').insert({
        proposal_id: proposalId,
        faculty_id: profile?.id,
        status: 'approved',
        comments: reviewComment,
        approved_at: new Date().toISOString(),
      })
      // Update event status
      const proposal = proposals.find(p => p.id === proposalId)
      if (proposal?.event_id) {
        await import('@/services/eventService').then(m =>
          m.eventService.updateEvent(proposal.event_id, { status: 'approved' })
        )
      }
      setProposals(proposals.filter(p => p.id !== proposalId))
      setSelectedProposal(null)
      setReviewComment('')
    } catch (err) {
      console.error('Failed to approve:', err)
    }
  }

  const handleReject = async (proposalId: string) => {
    try {
      await import('@/services/eventService').then(m =>
        m.eventService.updateProposal(proposalId, {
          status: 'rejected',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComment
        })
      )
      setProposals(proposals.filter(p => p.id !== proposalId))
      setSelectedProposal(null)
      setReviewComment('')
    } catch (err) {
      console.error('Failed to reject:', err)
    }
  }

  const openReview = (proposal: any) => {
    setSelectedProposal(proposal)
  }

  if (loading) return <LoadingSpinner size="lg" message="Loading approvals..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">Approval Queue</h1>
        <p className="text-muted mt-1">Review and approve event proposals</p>
      </div>

      {proposals.length === 0 ? (
        <GlassCard className="text-center py-16">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-muted">No pending proposals at the moment</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {proposals.map(proposal => (
            <GlassCard key={proposal.id} hover onClick={() => openReview(proposal)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-lg font-semibold">{proposal.title}</h3>
                    <span className={cn('badge', 'badge-amber')}>Pending Review</span>
                  </div>
                  <p className="text-sm text-muted mb-3">{proposal.events?.title || 'Unknown event'}</p>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>Submitted: {formatDate(proposal.submitted_at)}</span>
                    <span>By: {proposal.profiles?.full_name || 'Unknown'}</span>
                    {proposal.budget_estimate && (
                      <span>Budget: ₹{proposal.budget_estimate.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-muted" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-semibold">Review Proposal</h2>
                <p className="text-muted">{selectedProposal.events?.title}</p>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="p-2 glass rounded-xl hover:bg-white/5">
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="glass p-4 rounded-xl">
                <h4 className="font-medium mb-2">{selectedProposal.title}</h4>
                {selectedProposal.objectives && (
                  <p className="text-muted whitespace-pre-line mb-3">{selectedProposal.objectives}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted">Timeline</p>
                    <p>{selectedProposal.timeline || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted">Budget</p>
                    <p>₹{selectedProposal.budget_estimate?.toLocaleString() || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Review Comments</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="input min-h-[100px] resize-y"
                  placeholder="Add comments for the submitter..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  handleReject(selectedProposal.id)
                }}
                className="btn-danger"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedProposal.id)
                }}
                className="btn-primary"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

