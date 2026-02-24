alter table public.users
  add column if not exists provider_email text;
