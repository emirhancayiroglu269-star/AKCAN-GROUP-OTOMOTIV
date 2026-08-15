-- FAZ 42 — Atomic write RPC (HAZIRLIK)
-- Production'a otomatik uygulanmaz.
-- Amaç: optimistic locking + idempotency + audit bilgisini tek transaction'da korumak.
--
-- Not: Mevcut write_app_state imzasını doğrudan değiştirmek yerine yeni RPC adı
-- kullanmak, mevcut uygulamayı kırmadan kademeli geçiş sağlar.

create table if not exists public.app_state_write_keys (
  idempotency_key text primary key,
  request_version bigint not null,
  result_version bigint,
  created_at timestamptz not null default now()
);

alter table public.app_state_write_keys enable row level security;

create or replace function public.atomic_write_app_state(
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

  select version
    into v_current_version
    from public.app_state
   where id = 'main'
   for update;

  select result_version
    into v_existing_result
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
    raise exception 'VERSION_CONFLICT: beklenen %, mevcut %',
      p_expected_version, v_current_version;
  end if;

  update public.app_state
     set data = p_data,
         updated_at = now(),
         updated_by = p_updated_by,
         version = version + 1
   where id = 'main'
  returning app_state.updated_at, app_state.version, app_state.updated_by
    into updated_at, version, updated_by;

  insert into public.app_state_write_keys(
    idempotency_key, request_version, result_version
  )
  values (
    p_idempotency_key, p_expected_version, version
  );

  duplicate := false;
  return next;
end;
$function$;

revoke all on function public.atomic_write_app_state(jsonb,text,text,bigint) from public;
revoke execute on function public.atomic_write_app_state(jsonb,text,text,bigint) from anon;
revoke execute on function public.atomic_write_app_state(jsonb,text,text,bigint) from authenticated;

-- Uygulamanın güvenilir server/service katmanı üzerinden kontrollü grant verilmelidir.
