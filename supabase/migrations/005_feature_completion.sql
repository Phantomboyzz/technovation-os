-- Create a profile and default member record whenever a user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_role UUID;
BEGIN
  SELECT id INTO v_member_role FROM public.roles WHERE name = 'member';

  INSERT INTO public.profiles (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_member_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing demo/auth users after upgrading an existing database.
INSERT INTO public.profiles (id, email, full_name, role_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  r.id
FROM auth.users u
CROSS JOIN LATERAL (
  SELECT id
  FROM public.roles
  WHERE name = 'member'
  LIMIT 1
) r
ON CONFLICT (id) DO NOTHING;

-- Roles are reference data. Enable RLS and allow every authenticated user to read them.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_select_all" ON public.roles;
CREATE POLICY "roles_select_all" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Delete permissions for ideas and tasks.
DROP POLICY IF EXISTS "ideas_delete_own" ON public.event_ideas;
CREATE POLICY "ideas_delete_own" ON public.event_ideas
  FOR DELETE USING (
    created_by = auth.uid()
    OR get_my_role_level() >= 30
  );

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (
    created_by = auth.uid()
    OR get_my_role_level() >= 30
  );

-- Draft proposals are supported by the proposal builder.
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
