import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, RefreshCw, Filter } from 'lucide-react'
import { automationService } from '@/services/automationService'
import { GlassCard } from '@/components/common'
import { cn, timeAgo, formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function AutomationLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const data = await automationService.getLogs()
      setLogs(data)
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (statusFilter === 'all') return true
    return log.status === statusFilter
  })

  if (loading) return <LoadingSpinner size="lg" message="Loading logs..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Automation Logs</h1>
          <p className="text-muted mt-1">Execution history & debugging</p>
        </div>
        <button onClick={loadLogs} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <GlassCard padding="sm">
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </GlassCard>

      <GlassCard>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No automation logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-4 glass rounded-xl">
                <div className="flex items-center gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                    log.status === 'success' && 'bg-green-500/20',
                    log.status === 'failed' && 'bg-rose-500/20',
                    log.status === 'pending' && 'bg-amber-500/20'
                  )}>
                    {log.status === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {log.status === 'failed' && <XCircle className="w-5 h-5 text-rose-400" />}
                    {log.status === 'pending' && <Clock className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <p className="font-medium">{log.automation_rules?.name || 'Unknown Rule'}</p>
                    <p className="text-sm text-muted">{timeAgo(log.executed_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('badge',
                    log.status === 'success' && 'badge-green',
                    log.status === 'failed' && 'badge-rose',
                    log.status === 'pending' && 'badge-amber'
                  )}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}