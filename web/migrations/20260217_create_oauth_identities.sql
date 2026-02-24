create table if not exists public.oauth_identities (
  provider text not null,
  provider_user_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, provider_user_id)
);

create index if not exists oauth_identities_user_id_idx
  on public.oauth_identities (user_id);

alter table public.oauth_identities enable row level security;
