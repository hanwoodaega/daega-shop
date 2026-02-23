do $$
begin
  if not exists (select 1 from pg_type where typname = 'coupon_issue_trigger') then
    create type public.coupon_issue_trigger as enum ('PHONE_VERIFIED', 'ADMIN', 'ETC');
  end if;
end $$;

alter table public.coupons
  add column if not exists issue_trigger public.coupon_issue_trigger;

update public.coupons
  set issue_trigger = 'ADMIN'
  where issue_trigger is null;

alter table public.coupons
  alter column issue_trigger set default 'ADMIN',
  alter column issue_trigger set not null;
