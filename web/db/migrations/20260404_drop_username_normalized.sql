-- users.username만 사용 (username_normalized 제거)
-- 적용 전: 기존 데이터에서 username이 비어 있고 username_normalized만 있는 행이 있으면 먼저 채우세요.
--   update public.users set username = username_normalized where username is null and username_normalized is not null;

alter table if exists public.users
  drop column if exists username_normalized;
