create table if not exists public.user_terms (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_type text not null,
  agreed boolean not null default false,
  agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, terms_type)
);

create index if not exists user_terms_user_id_idx
  on public.user_terms (user_id);

alter table public.user_terms enable row level security;

drop policy if exists "user_terms_select_own" on public.user_terms;
create policy "user_terms_select_own"
  on public.user_terms
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_terms_insert_own" on public.user_terms;
create policy "user_terms_insert_own"
  on public.user_terms
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_terms_update_own" on public.user_terms;
create policy "user_terms_update_own"
  on public.user_terms
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
