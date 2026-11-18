-- ========================
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
  FOR INSERT WITH CHECK (TRUE);