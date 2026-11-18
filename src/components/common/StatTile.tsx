import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; label: string }
  color?: 'purple' | 'blue' | 'green' | 'amber' | 'rose' | 'cyan'
  className?: string
}

export function StatTile({ label, value, icon, trend, color = 'purple', className }: StatTileProps) {
  const colorClasses = {
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  }

  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{label}</p>
          <p className="text-3xl font-display font-bold">{value}</p>
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm', trend.value >= 0 ? 'text-green-400' : 'text-rose-400')}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}