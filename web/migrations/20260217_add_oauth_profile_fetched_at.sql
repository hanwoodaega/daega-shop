alter table public.oauth_identities
  add column if not exists profile_fetched_at timestamptz;
