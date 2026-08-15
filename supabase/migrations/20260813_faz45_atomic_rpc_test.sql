-- FAZ 45 — İzole Atomic RPC Test Migration
-- IMPORTANT: Production'a uygulanmamalıdır.
-- Bu migration yalnızca ayrı bir Supabase test projesi/branch için tasarlanmıştır.

create table if not exists public.app_state_write_keys (
  idempotency_key text primary key,
  request_version bigint not null,
  result_version bigint,
  created_at timestamptz not null default now()
);

create or replace function public.atomic_write_app_state_test(
  p_data jsonb,
  p_updated_by text,
  p_idempotency_key text,
  p_expected_version bigint
)
returns table(
  updated_at timestamptz,
  version bigint,
  updated_by text,
  duplicate boolean
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_version bigint;
  v_existing_result bigint;
begin
  if coalesce(trim(p_updated_by), '') = '' then
    raise exception 'updated_by zorunlu';
  end if;

  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'idempotency_key zorunlu';
  end if;

  select version into v_current_version
  from public.app_state
  where id = 'main'
  for update;

  select result_version into v_existing_result
  from public.app_state_write_keys
  where idempotency_key = p_idempotency_key;

  if found then
    return query
      select a.updated_at, a.version, a.updated_by, true
      from public.app_state a
      where a.id = 'main';
    return;
  end if;

  if v_current_version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  update public.app_state
  set data = p_data,
      updated_at = now(),
      updated_by = p_updated_by,
      version = version + 1
  where id = 'main'
  returning app_state.updated_at, app_state.version, app_state.updated_by
  into updated_at, version, updated_by;

  insert into public.app_state_write_keys
    (idempotency_key, request_version, result_version)
  values
    (p_idempotency_key, p_expected_version, version);

  duplicate := false;
  return next;
end;
$function$;

revoke all on function public.atomic_write_app_state_test(jsonb,text,text,bigint) from public;
revoke execute on function public.atomic_write_app_state_test(jsonb,text,text,bigint) from anon;
revoke execute on function public.atomic_write_app_state_test(jsonb,text,text,bigint) from authenticated;
