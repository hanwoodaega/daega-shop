-- Remove legacy first purchase coupon trigger (if exists)
do $$
declare
  trigger_record record;
begin
  for trigger_record in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'users'
      and t.tgname ilike '%first_purchase%'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on public.users', trigger_record.tgname);
  end loop;
end $$;
