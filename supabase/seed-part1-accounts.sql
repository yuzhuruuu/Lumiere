-- =====================================================================
-- SEED PART 1: CREATE TEST ACCOUNTS
-- Jalankan ini PERTAMA di SQL Editor
-- =====================================================================

-- Pastikan extension pgcrypto aktif
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Buat akun admin
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
)
VALUES (
    '10000000-0000-4000-8000-000000000999'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'admin@lumiere.test',
    crypt('LumiereDemo#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Lumiere","phone":"081299990999"}'::jsonb,
    now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

INSERT INTO auth.identities (user_id, identity_data, provider, provider_id, created_at, updated_at)
VALUES (
    '10000000-0000-4000-8000-000000000999'::uuid,
    '{"sub":"10000000-0000-4000-8000-000000000999","email":"admin@lumiere.test","email_verified":true}'::jsonb,
    'email',
    'admin@lumiere.test',
    now(), now()
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    updated_at = now();

-- Buat akun staf 1
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
)
VALUES (
    '10000000-0000-4000-8000-000000000901'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'staf1@lumiere.test',
    crypt('LumiereDemo#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Andika Pratama","phone":"081299990901"}'::jsonb,
    now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

INSERT INTO auth.identities (user_id, identity_data, provider, provider_id, created_at, updated_at)
VALUES (
    '10000000-0000-4000-8000-000000000901'::uuid,
    '{"sub":"10000000-0000-4000-8000-000000000901","email":"staf1@lumiere.test","email_verified":true}'::jsonb,
    'email',
    'staf1@lumiere.test',
    now(), now()
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    updated_at = now();

-- Buat akun pelanggan test
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
)
VALUES (
    '10000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'pelanggan01@lumiere.test',
    crypt('LumiereDemo#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alya Putri","phone":"081234560001"}'::jsonb,
    now(), now(), '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = now();

INSERT INTO auth.identities (user_id, identity_data, provider, provider_id, created_at, updated_at)
VALUES (
    '10000000-0000-4000-8000-000000000001'::uuid,
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"pelanggan01@lumiere.test","email_verified":true}'::jsonb,
    'email',
    'pelanggan01@lumiere.test',
    now(), now()
)
ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    updated_at = now();

-- Update role untuk admin dan staf (trigger sudah buat profile otomatis dengan role pelanggan)
UPDATE profiles SET role = 'admin' WHERE id = '10000000-0000-4000-8000-000000000999'::uuid;
UPDATE profiles SET role = 'staf' WHERE id = '10000000-0000-4000-8000-000000000901'::uuid;

-- Verifikasi
SELECT id, email, full_name, role FROM profiles WHERE email LIKE '%@lumiere.test' ORDER BY role, email;
