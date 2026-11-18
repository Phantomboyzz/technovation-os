export type UserRole = 'president' | 'vice_president' | 'hod' | 'faculty' | 'member'

export interface Permission {
  resource: string
  actions: string[]
}

export interface Role {
  id: string
  name: string
  level: number
  permissions: Permission[]
  description: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role_id: string
  phone: string | null
  bio: string | null
  created_at: string
  updated_at: string
  roles?: Role
}

export interface Department {
  id: string
  name: string
  description: string | null
  hod_id: string | null
  created_at: string
}

export interface Member {
  id: string
  profile_id: string
  department_id: string | null
  roll_number: string | null
  year: number | null
  status: 'active' | 'inactive' | 'alumni'
  created_at: string
  profiles?: Profile
  departments?: Department
}

export type EventStatus =
  | 'draft'
  | 'ideas_collecting'
  | 'proposal_submitted'
  | 'approved'
  | 'tasks_allocated'
  | 'in_progress'
  | 'completed'
  | 'archived'

export interface Event {
  id: string
  title: string
  description: string | null
  department_id: string | null
  status: EventStatus
  event_date: string | null
  venue: string | null
  budget: number | null
  created_by: string
  created_at: string
  updated_at: string
  departments?: Department
}

export interface EventIdea {
  id: string
  event_id: string
  title: string
  description: string | null
  category: string | null
  ai_generated: boolean
  upvotes: number
  created_by: string
  created_at: string
}

export interface Proposal {
  id: string
  event_id: string
  title: string
  objectives: string | null
  budget_estimate: number | null
  timeline: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_by: string
  submitted_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_comments: string | null
}

export interface Approval {
  id: string
  proposal_id: string
  faculty_id: string
  status: 'pending' | 'approved' | 'rejected'
  comments: string | null
  approved_at: string | null
}

export interface Task {
  id: string
  event_id: string
  department_id: string | null
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  due_date: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskAssignment {
  id: string
  task_id: string
  member_id: string
  assigned_by: string
  assigned_at: string
  status: 'pending' | 'accepted' | 'declined'
}

export interface AutomationRule {
  id: string
  name: string
  trigger: AutomationTrigger
  conditions: Record<string, any> | null
  actions: AutomationAction[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AutomationTrigger {
  type: 'db_change' | 'schedule' | 'webhook' | 'event'
  event?: string
  table?: string
  operation?: 'INSERT' | 'UPDATE' | 'DELETE'
  cron?: string
  field?: string
  value?: string
}

export interface AutomationAction {
  type: 'notify' | 'create_task' | 'assign_member' | 'update_status' | 'send_email'
  [key: string]: any
}

export interface AutomationLog {
  id: string
  rule_id: string
  trigger_data: Record<string, any> | null
  action_result: Record<string, any> | null
  executed_at: string
  status: 'success' | 'failed' | 'pending'
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  read: boolean
  read_at: string | null
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, any> | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any> | null
  created_at: string
}

export interface DashboardStats {
  total_members: number
  active_events: number
  pending_approvals: number
  completed_tasks: number
  overdue_tasks: number
  automation_rules_active: number
  notifications_unread: number
}