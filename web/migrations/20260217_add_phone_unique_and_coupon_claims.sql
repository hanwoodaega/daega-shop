-- Enforce one account per phone number
alter table public.users
  add column if not exists phone text;

create unique index if not exists users_phone_unique
  on public.users (phone)
  where phone is not null;

-- Coupon claims locked to phone number + campaign
create table if not exists public.coupon_claims (
  id bigserial primary key,
  campaign_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists coupon_claims_unique
  on public.coupon_claims (campaign_id, phone);

create index if not exists coupon_claims_user_id_idx
  on public.coupon_claims (user_id);

revoke all on table public.coupon_claims from anon, authenticated;
grant all on table public.coupon_claims to service_role;

alter table public.coupon_claims enable row level security;
