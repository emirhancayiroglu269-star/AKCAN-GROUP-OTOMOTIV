-- FAZ 30: AKCAN ERP RLS başlangıç şeması — BAŞLANGIÇ NOKTASI
-- Bu migration TASARIM/şablondur. Production Supabase'e uygulanmadan önce
-- gerçek tablo isimleri ve kolonlar mevcut şemayla eşleştirilmelidir.
--
-- ⚠️ UYGULANMADAN ÖNCE OKUNMALI (2026-02-20):
--   Uygulamanın TÜM verisi tek bir `public.app_state` satırında JSON olarak
--   duruyor (id='main', data jsonb). Ayrı `parcalar` / `satislar` / `cariler`
--   tabloları YOK. Bu yüzden aşağıdaki "kritik tablolar için gerçek policy'ler"
--   maddesi bugünkü şemayla UYGULANAMAZ — policy yazılacak tablo yok.
--
--   Tek satırlık app_state için RLS satır bazlı yetki veremez: ya tüm veri
--   okunur ya hiç okunmaz. Gerçek çözüm iki adımlı:
--     a) `app_state` yalnızca service_role'a açılır (RLS policy değil, grant).
--     b) Tüm yetki kontrolü Edge Function içinde yapılır — uygulama zaten
--        her isteği oraya gönderiyor (`merkeziIstek`).
--
--   `user_profiles` tablosu UYGULANMAYACAK — bkz. faz34 dosyasının başındaki
--   karar notu.

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
