-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ========================
-- CORE TABLES
-- ========================

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  level INTEGER NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id) DEFAULT NULL,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  hod_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  roll_number TEXT UNIQUE,
  year INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'alumni')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- EVENT LIFECYCLE TABLES
-- ========================

CREATE TYPE event_status AS ENUM (
  'draft', 'ideas_collecting', 'proposal_submitted',
  'approved', 'tasks_allocated', 'in_progress', 'completed', 'archived'
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status event_status DEFAULT 'draft',
  event_date TIMESTAMPTZ,
  venue TEXT,
  budget NUMERIC(12,2),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objectives TEXT,
  budget_estimate NUMERIC(12,2),
  timeline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMPTZ
);

-- ========================
-- TASK MANAGEMENT
-- ========================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined'))
);

-- ========================
-- AUTOMATION ENGINE
-- ========================

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trigger JSONB NOT NULL,
  conditions JSONB,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  trigger_data JSONB,
  action_result JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending'))
);

-- ========================
-- NOTIFICATIONS & AI
-- ========================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- INDEXES
-- ========================

CREATE INDEX idx_profiles_role ON profiles(role_id);
CREATE INDEX idx_members_dept ON members(department_id);
CREATE INDEX idx_members_profile ON members(profile_id);
CREATE INDEX idx_events_dept ON events(department_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_ideas_event ON event_ideas(event_id);
CREATE INDEX idx_proposals_event ON proposals(event_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_member ON task_assignments(member_id);
CREATE INDEX idx_automation_rules_active ON automation_rules(is_active);
CREATE INDEX idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- ========================
-- UPDATED_AT TRIGGERS
-- ========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================
-- HELPER FUNCTIONS
-- ========================

-- Upvote function for ideas
CREATE OR REPLACE FUNCTION upvote_idea(idea_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE event_ideas SET upvotes = upvotes + 1 WHERE id = idea_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- ========================
-- ROW LEVEL SECURITY (RLS)
-- ========================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ========================
-- HELPER FUNCTIONS FOR RLS
-- ========================

-- Get current user's role level
CREATE OR REPLACE FUNCTION get_my_role_level()
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER;
BEGIN
  SELECT r.level INTO v_level
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();
  RETURN COALESCE(v_level, 10);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role name
CREATE OR REPLACE FUNCTION get_my_role_name()
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT r.name INTO v_name
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();
  RETURN COALESCE(v_name, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's department
CREATE OR REPLACE FUNCTION get_my_department_id()
RETURNS UUID AS $$
DECLARE
  v_dept UUID;
BEGIN
  SELECT m.department_id INTO v_dept
  FROM members m
  WHERE m.profile_id = auth.uid();
  RETURN v_dept;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_permission(p_resource TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_perms JSONB;
BEGIN
  SELECT r.permissions INTO v_perms
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  IF v_perms IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_perms) AS permission
    WHERE permission->>'resource' = p_resource
      AND (
        (permission->'actions') ? p_action
        OR (permission->'actions') ? 'all'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- PROFILES POLICIES
-- ========================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users can view all profiles if level >= 30 (HOD+)
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (get_my_role_level() >= 30);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admins (level >= 40) can insert/update any profile
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_my_role_level() >= 40);

-- ========================
-- DEPARTMENTS POLICIES
-- ========================

-- Everyone can view departments
CREATE POLICY "departments_select_all" ON departments
  FOR SELECT USING (TRUE);

-- Only President/VP can create/update/delete departments
CREATE POLICY "departments_admin" ON departments
  FOR ALL USING (get_my_role_level() >= 40);

-- ========================
-- MEMBERS POLICIES
-- ========================

-- Members can view their own record
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (profile_id = auth.uid());

-- HOD+ can view members in their department
CREATE POLICY "members_select_dept" ON members
  FOR SELECT USING (
    get_my_role_level() >= 30 AND department_id = get_my_department_id()
  );

-- President/VP can view all members
CREATE POLICY "members_select_all" ON members
  FOR SELECT USING (get_my_role_level() >= 40);

-- President/VP can manage all members
CREATE POLICY "members_admin" ON members
  FOR ALL USING (get_my_role_level() >= 40);

-- HOD can update members in their department
CREATE POLICY "members_update_dept" ON members
  FOR UPDATE USING (
    get_my_role_level() >= 30 AND department_id = get_my_department_id()
  );

-- ========================
-- EVENTS POLICIES
-- ========================

-- Everyone can view events
CREATE POLICY "events_select_all" ON events
  FOR SELECT USING (TRUE);

-- President/VP/HOD can create events
CREATE POLICY "events_create" ON events
  FOR INSERT WITH CHECK (get_my_role_level() >= 10);

-- Creator or HOD+ can update event
CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR get_my_role_level() >= 30
  );

-- Only President/VP can delete events
CREATE POLICY "events_delete" ON events
  FOR DELETE USING (get_my_role_level() >= 40);

-- ========================
-- EVENT IDEAS POLICIES
-- ========================

-- Everyone can view ideas for events
CREATE POLICY "ideas_select_all" ON event_ideas
  FOR SELECT USING (TRUE);

-- Authenticated users can submit ideas
CREATE POLICY "ideas_insert" ON event_ideas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Creator can update their idea
CREATE POLICY "ideas_update_own" ON event_ideas
  FOR UPDATE USING (created_by = auth.uid());

-- ========================
-- PROPOSALS POLICIES
-- ========================

-- Everyone can view proposals
CREATE POLICY "proposals_select_all" ON proposals
  FOR SELECT USING (TRUE);

-- President/VP/HOD can create proposals
CREATE POLICY "proposals_create" ON proposals
  FOR INSERT WITH CHECK (get_my_role_level() >= 10);

-- Submitter can update, Faculty+ can approve
CREATE POLICY "proposals_update" ON proposals
  FOR UPDATE USING (
    submitted_by = auth.uid() OR get_my_role_level() >= 20
  );

-- ========================
-- APPROVALS POLICIES
-- ========================

-- Everyone can view approvals
CREATE POLICY "approvals_select_all" ON approvals
  FOR SELECT USING (TRUE);

-- Faculty advisors can create approvals
CREATE POLICY "approvals_create_faculty" ON approvals
  FOR INSERT WITH CHECK (get_my_role_level() >= 20);

-- Faculty can update their approval
CREATE POLICY "approvals_update_own" ON approvals
  FOR UPDATE USING (faculty_id = auth.uid());

-- ========================
-- TASKS POLICIES
-- ========================

-- Everyone can view tasks
CREATE POLICY "tasks_select_all" ON tasks
  FOR SELECT USING (TRUE);

-- President/VP/HOD can create tasks
CREATE POLICY "tasks_create" ON tasks
  FOR INSERT WITH CHECK (get_my_role_level() >= 30);

-- Assignee or creator or HOD+ can update
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    assigned_to = auth.uid() OR created_by = auth.uid() OR get_my_role_level() >= 30
  );

-- ========================
-- TASK ASSIGNMENTS POLICIES
-- ========================

-- Everyone can view assignments
CREATE POLICY "task_assignments_select_all" ON task_assignments
  FOR SELECT USING (TRUE);

-- HOD+ can create assignments
CREATE POLICY "task_assignments_create" ON task_assignments
  FOR INSERT WITH CHECK (get_my_role_level() >= 30);

-- Assigned member can update status
CREATE POLICY "task_assignments_update_member" ON task_assignments
  FOR UPDATE USING (member_id = auth.uid());

-- ========================
-- AUTOMATION RULES POLICIES
-- ========================

-- President/VP can view all rules
CREATE POLICY "automation_rules_select_admin" ON automation_rules
  FOR SELECT USING (get_my_role_level() >= 40);

-- President/VP can manage rules
CREATE POLICY "automation_rules_admin" ON automation_rules
  FOR ALL USING (get_my_role_level() >= 40);

-- ========================
-- AUTOMATION LOGS POLICIES
-- ========================

-- President/VP can view all logs
CREATE POLICY "automation_logs_select_admin" ON automation_logs
  FOR SELECT USING (get_my_role_level() >= 40);

-- ========================
-- NOTIFICATIONS POLICIES
-- ========================

-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "notifications_system_insert" ON notifications
  FOR INSERT WITH CHECK (TRUE);

-- ========================
-- CHAT HISTORY POLICIES
-- ========================

-- Users can view their own chat history
CREATE POLICY "chat_history_select_own" ON chat_history
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own messages
CREATE POLICY "chat_history_insert_own" ON chat_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================
-- AUDIT LOG POLICIES
-- ========================

-- President/VP can view all audit logs
CREATE POLICY "audit_log_select_admin" ON audit_log
  FOR SELECT USING (get_my_role_level() >= 40);

-- System can insert audit logs
CREATE POLICY "audit_log_system_insert" ON audit_log
  FOR INSERT WITH CHECK (TRUE);-- ========================
-- SEED DATA FOR DEMO/HACKATHON
-- ========================

-- Insert roles
INSERT INTO roles (name, level, permissions, description) VALUES
('president', 50, '[
  {"resource": "members", "actions": ["create", "read", "update", "delete", "assign"]},
  {"resource": "departments", "actions": ["create", "read", "update", "delete"]},
  {"resource": "events", "actions": ["create", "read", "update", "delete", "approve"]},
  {"resource": "proposals", "actions": ["create", "read", "update", "delete", "approve"]},
  {"resource": "tasks", "actions": ["create", "read", "update", "delete", "assign"]},
  {"resource": "automations", "actions": ["create", "read", "update", "delete"]},
  {"resource": "roles", "actions": ["create", "read", "update", "delete"]},
  {"resource": "settings", "actions": ["read", "update"]},
  {"resource": "assistant", "actions": ["read"]}
]', 'Society President - Full access'),

('vice_president', 40, '[
  {"resource": "members", "actions": ["read", "update"]},
  {"resource": "departments", "actions": ["read"]},
  {"resource": "events", "actions": ["create", "read", "update", "delete"]},
  {"resource": "proposals", "actions": ["create", "read", "update", "approve"]},
  {"resource": "tasks", "actions": ["create", "read", "update", "delete", "assign"]},
  {"resource": "automations", "actions": ["create", "read", "update", "delete"]},
  {"resource": "assistant", "actions": ["read"]}
]', 'Vice President - All except role management'),

('hod', 30, '[
  {"resource": "members", "actions": ["read", "update"]},
  {"resource": "departments", "actions": ["read"]},
  {"resource": "events", "actions": ["create", "read", "update"]},
  {"resource": "proposals", "actions": ["create", "read", "update"]},
  {"resource": "tasks", "actions": ["create", "read", "update", "assign"]},
  {"resource": "automations", "actions": ["read"]},
  {"resource": "assistant", "actions": ["read"]}
]', 'Head of Department - Manage own department'),

('faculty', 20, '[
  {"resource": "members", "actions": ["read"]},
  {"resource": "departments", "actions": ["read"]},
  {"resource": "events", "actions": ["read"]},
  {"resource": "proposals", "actions": ["read", "approve"]},
  {"resource": "tasks", "actions": ["read", "assign"]},
  {"resource": "automations", "actions": ["read"]},
  {"resource": "assistant", "actions": ["read"]}
]', 'Faculty Advisor - Approve proposals, assign tasks'),

('member', 10, '[
  {"resource": "members", "actions": ["read"]},
  {"resource": "departments", "actions": ["read"]},
  {"resource": "events", "actions": ["read", "create"]},
  {"resource": "proposals", "actions": ["read", "create"]},
  {"resource": "tasks", "actions": ["read", "update"]},
  {"resource": "automations", "actions": []},
  {"resource": "assistant", "actions": ["read"]}
]', 'Regular Member - View and participate');

-- Note: Profiles will be created via Supabase Auth
-- These are template members that will be linked after auth signup
-- The actual profiles are created when users sign up via the frontend

-- Departments
INSERT INTO departments (id, name, description, hod_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Technical', 'Core engineering, coding, and technical events', NULL),
('22222222-2222-2222-2222-222222222222', 'Cultural', 'Arts, music, dance, and cultural festivals', NULL),
('33333333-3333-3333-3333-333333333333', 'Entrepreneurship', 'Startup events, pitch competitions, mentorship', NULL),
('44444444-4444-4444-4444-444444444444', 'Sports', 'Athletic events, tournaments, fitness', NULL),
('55555555-5555-5555-5555-555555555555', 'Social Impact', 'Community service, outreach, sustainability', NULL);

-- Sample automation rules (will work once profiles exist)
INSERT INTO automation_rules (name, trigger, conditions, actions, is_active, created_by) VALUES
(
  'Auto-assign HOD tasks on event approval',
  '{"type": "db_change", "table": "proposals", "operation": "UPDATE", "field": "status", "value": "approved"}',
  '{"department_id": "{{proposal.events.department_id}}"}',
  '[
    {"type": "create_task", "title": "Plan execution for {{proposal.title}}", "department": "{{department_id}}", "due_days": 7},
    {"type": "notify", "to_role": "hod", "department": "{{department_id}}", "message": "Proposal approved: {{proposal.title}}. Tasks created."}
  ]',
  TRUE,
  NULL
),
(
  'Task due soon reminder',
  '{"type": "schedule", "cron": "0 * * * *"}', -- Every hour
  '{}',
  '[
    {"type": "notify", "to_assignee": true, "template": "Task due soon: {{task.title}} is due {{task.due_date}}"}
  ]',
  TRUE,
  NULL
),
(
  'New proposal submitted notification',
  '{"type": "db_change", "table": "proposals", "operation": "INSERT"}',
  '{}',
  '[
    {"type": "notify", "to_role": "faculty", "message": "New proposal submitted: {{proposal.title}} for {{proposal.events.title}}"}
  ]',
  TRUE,
  NULL
);

-- Sample events (will be created after profiles exist)
-- These are templates - actual events created via frontend-- ========================
-- PG_CRON JOBS FOR AUTOMATION
-- ========================

-- Enable pg_cron extension (already enabled in 001_init_schema.sql)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the automation processor to run every minute
-- This calls the Edge Function via HTTP
SELECT cron.schedule(
  'process-automation-every-minute',
  '* * * * *', -- every minute
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"trigger_data": {"scheduled": true}}'::jsonb
  );
  $$
);

-- Schedule reminder checks every hour
SELECT cron.schedule(
  'task-reminders-hourly',
  '0 * * * *', -- at minute 0 of every hour
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"trigger_data": {"reminder_check": true}}'::jsonb
  );
  $$
);

-- Clean up old automation logs daily (keep last 30 days)
SELECT cron.schedule(
  'cleanup-automation-logs-daily',
  '0 2 * * *', -- 2 AM daily
  $$
  DELETE FROM automation_logs
  WHERE executed_at < NOW() - INTERVAL '30 days';
  $$
);

-- Clean up read notifications older than 90 days
SELECT cron.schedule(
  'cleanup-notifications-daily',
  '0 3 * * *', -- 3 AM daily
  $$
  DELETE FROM notifications
  WHERE read = true AND read_at < NOW() - INTERVAL '90 days';
  $$
);

-- ========================
-- DATABASE WEBHOOKS FOR REAL-TIME TRIGGERS
-- ========================

-- Webhook for proposal status changes
-- This requires the Supabase HTTP extension and proper webhook configuration
-- In production, configure via Supabase Dashboard > Database > Webhooks

-- Example webhook payload structure for proposal approval:
-- {
--   "type": "INSERT",
--   "table": "proposals",
--   "record": { ...new_proposal_data... },
--   "old_record": null
-- }

-- The process-automation Edge Function handles these via:
-- 1. Database webhooks (configured in Supabase Dashboard)
-- 2. pg_cron for scheduled triggers
-- 3. Manual API calls

-- ========================
-- HELPER: Set up app settings for cron jobs
-- ========================

-- Create a settings table for cron configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- Insert default settings (update with actual values)
INSERT INTO app_settings (key, value, description) VALUES
('supabase_url', 'http://localhost:54321', 'Supabase project URL'),
('service_role_key', '', 'Service role key for server-side operations')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "app_settings_admin_read" ON app_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.level >= 40
    )
  );

-- ========================
-- GRANT CRON PERMISSIONS
-- ========================

-- Grant cron usage to postgres (default)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Note: In Supabase local development, pg_cron runs automatically
-- In production Supabase, enable pg_cron in Database > Extensions