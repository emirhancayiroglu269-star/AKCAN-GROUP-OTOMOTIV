-- FAZ 34 — Auth/Profile hazırlığı
-- Bu migration şablondur; production'a uygulanmadan önce doğrulanmalıdır.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_user_id text unique,
  role_id text,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_self_read" on public.user_profiles;
create policy "user_profiles_self_read"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

comment on table public.user_profiles is
'Application user profile. Passwords must never be stored here; authentication belongs to Supabase Auth.';
