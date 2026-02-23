alter table public.users
  drop column if exists provider_email,
  drop column if exists naver_id;
