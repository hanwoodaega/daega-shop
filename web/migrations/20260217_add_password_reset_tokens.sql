create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  phone text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_token_hash_idx
  on public.password_reset_tokens (token_hash);

alter table public.password_reset_tokens enable row level security;
