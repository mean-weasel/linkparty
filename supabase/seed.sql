-- =============================================================================
-- Test User Seed Data
-- =============================================================================
-- 3 test users for E2E multi-user social tests (WF11-17).
-- The handle_new_user() trigger (migration 016) auto-creates user_profiles rows.
--
-- Users:
--   alice@test.local / testpassword1 / UUID aaaa...
--   bob@test.local   / testpassword2 / UUID bbbb...
--   carol@test.local / testpassword3 / UUID cccc...
--
-- Usage: supabase db reset  (applies migrations then runs this seed)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- auth.users
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated',
    'alice@test.local',
    crypt('testpassword1', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Alice Test"}',
    NOW(), NOW(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated',
    'bob@test.local',
    crypt('testpassword2', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Bob Test"}',
    NOW(), NOW(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated',
    'carol@test.local',
    crypt('testpassword3', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Carol Test"}',
    NOW(), NOW(),
    '', '', '', ''
  );

-- ---------------------------------------------------------------------------
-- auth.identities  (required for GoTrue email/password login)
-- ---------------------------------------------------------------------------

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    jsonb_build_object(
      'sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'email', 'alice@test.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW(), NOW(), NOW()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    jsonb_build_object(
      'sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'email', 'bob@test.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NOW(), NOW(), NOW()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    jsonb_build_object(
      'sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'email', 'carol@test.local',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    NOW(), NOW(), NOW()
  );

-- ---------------------------------------------------------------------------
-- Update auto-created user_profiles with usernames and avatars
-- (handle_new_user trigger already created rows with display_name from metadata)
-- ---------------------------------------------------------------------------

UPDATE public.user_profiles
SET username = 'alice', display_name = 'Alice Test', avatar_value = '🦊'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

UPDATE public.user_profiles
SET username = 'bob', display_name = 'Bob Test', avatar_value = '🐻'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

UPDATE public.user_profiles
SET username = 'carol', display_name = 'Carol Test', avatar_value = '🦄'
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
