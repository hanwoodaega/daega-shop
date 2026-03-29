-- Optional: add is_admin only if you use Supabase-based admin login (not used by password-only flow).
-- Apply in Supabase SQL editor or migration runner.

alter table public.users
  add column if not exists is_admin boolean not null default false;

create index if not exists idx_users_is_admin_true on public.users (id) where is_admin = true;

comment on column public.users.is_admin is 'When true, user may obtain admin session via /api/admin/login (supabase mode).';
