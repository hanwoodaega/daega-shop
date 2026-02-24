create table if not exists public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  resend_available_at timestamptz not null,
  locked_until timestamptz,
  verified_at timestamptz,
  verification_token_hash text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_otps_phone_purpose_created_at_idx
  on public.auth_otps (phone, purpose, created_at desc);

alter table public.auth_otps enable row level security;
