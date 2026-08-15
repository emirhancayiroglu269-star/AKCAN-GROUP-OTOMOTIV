-- FAZ 30: AKCAN ERP RLS başlangıç şeması
-- Bu migration TASARIM/şablondur. Production Supabase'e uygulanmadan önce
-- gerçek tablo isimleri ve kolonlar mevcut şemayla eşleştirilmelidir.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'salt-okuma'
    check (role in ('admin','yonetici','satis','depo','muhasebe','servis','salt-okuma')),
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

-- Kullanıcı yalnızca kendi profilini okuyabilir.
drop policy if exists "profile_self_select" on public.user_profiles;
create policy "profile_self_select"
on public.user_profiles for select
to authenticated
using (id = auth.uid());

-- Yönetici/admin tüm profilleri okuyabilir.
drop policy if exists "profile_admin_select" on public.user_profiles;
create policy "profile_admin_select"
on public.user_profiles for select
to authenticated
using (public.current_user_role() in ('admin','yonetici'));

-- Aşağıdaki yardımcı fonksiyon kritik işlemler için kullanılabilir.
create or replace function public.has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = any(required_roles)
$$;

-- Örnek politika matrisi:
-- satış: satış işlemleri
-- depo: stok
-- muhasebe: finans/cari
-- admin/yonetici: geniş yönetim
-- salt-okuma: yalnız okuma
--
-- Kritik tablolar için gerçek policy'ler, gerçek tablo şeması görüldükten sonra
-- ayrı migration ile oluşturulmalıdır.
