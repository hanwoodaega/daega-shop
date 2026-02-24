alter table public.users
  add column if not exists restored_at timestamptz,
  add column if not exists deleted_phone_hash text,
  add column if not exists deleted_phone_last4 text;
