-- FAZ 34 — Auth/Profile hazırlığı (ERTELENDİ)
--
-- DURUM: UYGULANMAYACAK — bilinçli karar, 2026-02-20.
--
-- NEDEN: Bu migration `public.user_profiles` tablosunu oluşturuyor ama uygulama
-- bu tabloyu HİÇ okumuyor/yazmıyor (kodda `user_profiles` geçen tek satır yok).
-- Kullanıcı bilgisi bugün `app_state` JSON'u içinde `db.kullanicilar` dizisinde
-- duruyor: { id, adSoyad, kullaniciAdi, sifre, rolId, aktif, sonGiris }.
--
-- BUNUN YERİNE YAPILMASI GEREKEN (henüz yapılmadı):
--   Bugün şifreler `db.kullanicilar[].sifre` alanında DÜZ METİN saklanıyor ve
--   doğrulama istemcide yapılıyor (src/App.tsx:368, src/lib/yonetici-onay.ts:29,
--   src/modules/StokOperasyon.tsx:1358). Şifreler hiçbir yerde hash'lenmiyor.
--   Düz metin şifre, RLS eklenmesinden BAĞIMSIZ olarak tek başına en büyük
--   güvenlik açığıdır: app_state'i okuyabilen herkes tüm şifreleri görür.
--
--   Sıra şu olmalı:
--     1) Gerçek bir Supabase projesi (bugün proje adresi DNS'te yok)
--     2) Şifrelerin Supabase Auth'a taşınması — uygulama tablosunda şifre kalmaz
--     3) user_profiles yalnızca rol/izin taşır: (id → auth.users.id, rol, aktif)
--     4) RLS politikaları 3. adımdan sonra anlamlı olur
--
--   Bu dosya o zamana kadar referans olarak duruyor. Uygulanmayacak olması bir
--   eksiklik değil, karar: kullanılmayan bir tabloyu production'a eklemek
--   saldırı yüzeyini artırır, güvenlik sağlamaz.
--
-- Bu dosya `supabase db push` ile ÇALIŞMAZ (aşağıdaki tek satır hariç tüm SQL
-- yorum içinde).

-- Aşağıdaki blok bilerek yorum içine alındı: migration'ın kendisi uygulanmıyor.
/*
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
*/
