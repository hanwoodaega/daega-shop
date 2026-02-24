alter table public.users
  add column if not exists phone_verified_at timestamptz;
