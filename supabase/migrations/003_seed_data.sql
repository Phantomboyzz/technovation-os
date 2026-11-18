-- ========================
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
-- These are templates - actual events created via frontend