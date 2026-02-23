-- oauth_identities: lock down completely (server-only access)
revoke all on table public.oauth_identities from anon, authenticated;
grant all on table public.oauth_identities to service_role;

alter table public.oauth_identities enable row level security;

-- public.users: allow authenticated users to read/update their own profile
alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);
