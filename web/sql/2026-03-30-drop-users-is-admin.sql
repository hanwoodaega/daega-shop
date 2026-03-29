-- Revert 2026-03-29-users-is-admin.sql (is_admin not needed for password-only admin).
-- Run in Supabase SQL editor.

drop index if exists public.idx_users_is_admin_true;

alter table public.users
  drop column if exists is_admin;
