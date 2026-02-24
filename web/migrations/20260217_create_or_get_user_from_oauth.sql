create or replace function public.create_or_get_user_from_oauth(
  p_provider text,
  p_provider_user_id text,
  p_auth_user_id uuid,
  p_name text,
  p_phone text,
  p_profile_fetched_at timestamptz,
  p_refresh_ttl_seconds integer,
  p_now timestamptz
)
returns table (
  user_id uuid,
  status text,
  phone text,
  phone_verified_at timestamptz,
  was_deleted boolean,
  linked_existing boolean,
  should_refresh boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity_user_id uuid;
  v_identity_fetched_at timestamptz;
  v_user_id uuid;
  v_profile_status text;
  v_profile_phone text;
  v_profile_phone_verified_at timestamptz;
  v_was_deleted boolean := false;
  v_linked_existing boolean := false;
  v_should_refresh boolean := false;
begin
  select oi.user_id, oi.profile_fetched_at
    into v_identity_user_id, v_identity_fetched_at
  from oauth_identities oi
  where oi.provider = p_provider
    and oi.provider_user_id = p_provider_user_id;

  v_user_id := v_identity_user_id;

  if v_user_id is null and p_phone is not null then
    select u.id
      into v_user_id
    from users u
    where u.phone = p_phone
    limit 1;
    if v_user_id is not null then
      v_linked_existing := true;
    end if;
  end if;

  if v_user_id is null then
    if p_auth_user_id is null then
      raise exception 'missing auth_user_id';
    end if;
    v_user_id := p_auth_user_id;
  end if;

  v_should_refresh :=
    (v_identity_user_id is null)
    or (v_identity_fetched_at is null)
    or (
      p_refresh_ttl_seconds is not null
      and p_now - v_identity_fetched_at > make_interval(secs => p_refresh_ttl_seconds)
    );

  select u.status, u.phone, u.phone_verified_at
    into v_profile_status, v_profile_phone, v_profile_phone_verified_at
  from users u
  where u.id = v_user_id;

  v_was_deleted := v_profile_status = 'deleted';

  insert into oauth_identities (
    provider,
    provider_user_id,
    user_id,
    profile_fetched_at,
    updated_at
  )
  values (
    p_provider,
    p_provider_user_id,
    v_user_id,
    case
      when v_should_refresh then p_profile_fetched_at
      else v_identity_fetched_at
    end,
    p_now
  )
  on conflict (provider, provider_user_id)
  do update set
    user_id = excluded.user_id,
    profile_fetched_at = excluded.profile_fetched_at,
    updated_at = excluded.updated_at;

  if v_should_refresh and not v_was_deleted then
  update users
    set
      name = case when p_name is not null then p_name else users.name end,
      phone = case when p_phone is not null then p_phone else users.phone end,
      phone_verified_at = case when p_phone is not null then p_now else users.phone_verified_at end,
      updated_at = p_now
    where id = v_user_id;
  end if;

  select u.status, u.phone, u.phone_verified_at
    into v_profile_status, v_profile_phone, v_profile_phone_verified_at
  from users u
  where u.id = v_user_id;

  if v_profile_status is null then
    v_profile_status := 'pending';
  end if;

  if v_profile_status <> 'deleted' then
    if v_profile_phone is null or v_profile_phone_verified_at is null then
      if v_profile_status <> 'pending' then
        update users set status = 'pending' where id = v_user_id;
        v_profile_status := 'pending';
      end if;
    else
      if v_profile_status <> 'active' then
        update users set status = 'active' where id = v_user_id;
        v_profile_status := 'active';
      end if;
    end if;
  end if;

  user_id := v_user_id;
  status := v_profile_status;
  phone := v_profile_phone;
  phone_verified_at := v_profile_phone_verified_at;
  was_deleted := v_was_deleted;
  linked_existing := v_linked_existing;
  should_refresh := v_should_refresh;
  return next;
end;
$$;
