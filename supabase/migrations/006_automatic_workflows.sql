CREATE OR REPLACE FUNCTION public.on_proposal_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_title TEXT;
  v_department_id UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT title, department_id INTO v_event_title, v_department_id
    FROM events WHERE id = NEW.event_id;

    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT p.id, 'proposal', 'New proposal needs approval',
           'Proposal "' || NEW.title || '" was submitted for ' || COALESCE(v_event_title, 'the event') || '.',
           'proposal', NEW.id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE r.level >= 20;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    SELECT title, department_id INTO v_event_title, v_department_id
    FROM events WHERE id = NEW.event_id;

    INSERT INTO tasks (
      event_id, department_id, title, description, due_date, created_by, status
    )
    VALUES (
      NEW.event_id,
      v_department_id,
      'Plan execution: ' || NEW.title,
      'Execute the approved proposal and coordinate with the assigned department.',
      NOW() + INTERVAL '7 days',
      NEW.submitted_by,
      'pending'
    );

    UPDATE events
    SET status = 'tasks_allocated', updated_at = NOW()
    WHERE id = NEW.event_id;

    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT p.id, 'approval', 'Proposal approved',
           'Proposal "' || NEW.title || '" was approved and execution tasks were created.',
           'event', NEW.event_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE r.level >= 30;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.submitted_by,
      'proposal',
      'Proposal rejected',
      'Proposal "' || NEW.title || '" was rejected. Review comments: ' || COALESCE(NEW.review_comments, 'None'),
      'proposal',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proposal_workflow_trigger ON public.proposals;
CREATE TRIGGER proposal_workflow_trigger
  AFTER INSERT OR UPDATE OF status ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.on_proposal_workflow();

CREATE OR REPLACE FUNCTION public.on_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, entity_type, entity_id, metadata
  )
  VALUES (
    NEW.member_id,
    'handover',
    'Responsibility transfer request',
    'You have been asked to accept responsibility for a task.',
    'task',
    NEW.task_id,
    jsonb_build_object('assignment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_assignment_notification_trigger ON public.task_assignments;
CREATE TRIGGER task_assignment_notification_trigger
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.on_task_assignment();
