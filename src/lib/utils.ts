import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isOverdue(date: string | Date): boolean {
  return isBefore(new Date(date), new Date())
}

export function isDueSoon(date: string | Date, hours = 24): boolean {
  const d = new Date(date)
  const now = new Date()
  const soon = new Date(now.getTime() + hours * 60 * 60 * 1000)
  return isAfter(d, now) && isBefore(d, soon)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function truncate(str: string | null | undefined, length = 80): string {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function getEventStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    ideas_collecting: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    proposal_submitted: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    approved: 'text-green-400 bg-green-500/10 border-green-500/20',
    tasks_allocated: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    in_progress: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    archived: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  }
  return colors[status] || colors.draft
}

export function getEventStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    ideas_collecting: 'Ideation',
    proposal_submitted: 'Proposal',
    approved: 'Approved',
    tasks_allocated: 'Tasks Allocated',
    in_progress: 'In Progress',
    completed: 'Completed',
    archived: 'Archived',
  }
  return labels[status] || status
}

export function getEventProgress(status: string): number {
  const order = ['draft', 'ideas_collecting', 'proposal_submitted', 'approved', 'tasks_allocated', 'in_progress', 'completed']
  const idx = order.indexOf(status)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / order.length) * 100)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function generateId(): string {
  return crypto.randomUUID()
}