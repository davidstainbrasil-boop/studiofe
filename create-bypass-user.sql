-- Create bypass user for development/testing
-- This script creates the bypass user in both auth.users and public.users tables

-- 1. Insert into auth.users (Supabase Auth)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user
)
VALUES (
    '12b21f2e-8ac1-480c-af1e-542a7d9b185a'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@estudio.ai',
    'devenv', -- encrypted password hash (not real, bypass doesn't check password)
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Dev Bypass Admin"}'::jsonb,
    false,
    false
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert into public.users
INSERT INTO public.users (
    id,
    email,
    name,
    role,
    plan_tier,
    created_at,
    updated_at,
    metadata
)
VALUES (
    '12b21f2e-8ac1-480c-af1e-542a7d9b185a'::uuid,
    'admin@estudio.ai',
    'Dev Bypass Admin',
    'admin',
    'free',
    NOW(),
    NOW(),
    '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
