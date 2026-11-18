-- Reproducible local demo accounts.
-- These credentials are for local demonstration only. Never use them in production.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, is_sso_user
  )
  VALUES
    (v_instance_id, 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
     'president@demo.techno', crypt('President@123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo President"}', NOW(), NOW(), '', false),
    (v_instance_id, 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
     'vicepresident@demo.techno', crypt('VicePresident@123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Vice President"}', NOW(), NOW(), '', false),
    (v_instance_id, 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
     'hod@demo.techno', crypt('HOD@123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo HOD"}', NOW(), NOW(), '', false),
    (v_instance_id, 'a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
     'faculty@demo.techno', crypt('Faculty@123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Faculty Advisor"}', NOW(), NOW(), '', false),
    (v_instance_id, 'a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
     'member@demo.techno', crypt('Member@123', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Member"}', NOW(), NOW(), '', false)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = EXCLUDED.email_confirmed_at,
      raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      updated_at = NOW();

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     '{"sub":"a0000000-0000-0000-0000-000000000001","email":"president@demo.techno"}', 'email',
     'a0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
     '{"sub":"a0000000-0000-0000-0000-000000000002","email":"vicepresident@demo.techno"}', 'email',
     'a0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
     '{"sub":"a0000000-0000-0000-0000-000000000003","email":"hod@demo.techno"}', 'email',
     'a0000000-0000-0000-0000-000000000003', NOW(), NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004',
     '{"sub":"a0000000-0000-0000-0000-000000000004","email":"faculty@demo.techno"}', 'email',
     'a0000000-0000-0000-0000-000000000004', NOW(), NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005',
     '{"sub":"a0000000-0000-0000-0000-000000000005","email":"member@demo.techno"}', 'email',
     'a0000000-0000-0000-0000-000000000005', NOW(), NOW(), NOW())
  ON CONFLICT (provider_id, provider) DO UPDATE
  SET identity_data = EXCLUDED.identity_data,
      last_sign_in_at = EXCLUDED.last_sign_in_at,
      updated_at = NOW();
END;
$$;

  UPDATE auth.users
  SET
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    recovery_token = '',
    reauthentication_token = '',
    phone_change = '',
    phone_change_token = '',
    is_anonymous = COALESCE(is_anonymous, false)
  WHERE id IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005'
  );

UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'president')
WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'vice_president')
WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'hod')
WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'faculty')
WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'member')
WHERE id = 'a0000000-0000-0000-0000-000000000005';

INSERT INTO members (profile_id, department_id, roll_number, year, status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'PRESIDENT-DEMO', 4, 'active'),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'VICEPRESIDENT-DEMO', 4, 'active'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'HOD-DEMO', 4, 'active'),
  ('a0000000-0000-0000-0000-000000000004', NULL, 'FACULTY-DEMO', 4, 'active'),
  ('a0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'MEMBER-DEMO', 2, 'active');
