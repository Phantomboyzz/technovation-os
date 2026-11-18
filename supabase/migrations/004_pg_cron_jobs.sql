CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.send_due_task_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, entity_type, entity_id
  )
  SELECT
    t.assigned_to,
    'reminder',
    'Task due soon',
    'Task "' || t.title || '" is due ' || to_char(t.due_date, 'DD Mon YYYY HH24:MI') || '.',
    'task',
    t.id
  FROM tasks t
  WHERE t.assigned_to IS NOT NULL
    AND t.status != 'completed'
    AND t.due_date IS NOT NULL
    AND t.due_date <= NOW() + INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.entity_type = 'task'
        AND n.entity_id = t.id
        AND n.type = 'reminder'
        AND n.created_at >= NOW() - INTERVAL '24 hours'
    );
END;
$$;

SELECT cron.schedule(
  'task-reminders-hourly',
  '0 * * * *',
  'SELECT public.send_due_task_reminders();'
);

SELECT cron.schedule(
  'cleanup-automation-logs-daily',
  '0 2 * * *',
  'DELETE FROM automation_logs WHERE executed_at < NOW() - INTERVAL ''30 days'';'
);

SELECT cron.schedule(
  'cleanup-notifications-daily',
  '0 3 * * *',
  'DELETE FROM notifications WHERE read = true AND read_at < NOW() - INTERVAL ''90 days'';'
);
