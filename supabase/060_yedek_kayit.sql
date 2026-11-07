-- 060 · Yedek kaydı (yalnız yeni tablo)
-- Gecelik yedek işinin (ayrı gizli GitHub deposu) sonucunu tutar; sitede Ayarlar > Yedekler'de görünür.
-- Mevcut hiçbir tabloya, kayda, politikaya ya da fonksiyona dokunmaz. Yetki değişikliği (059) bu dosyada YOK.
create table if not exists public.yedek_kayit (
  id bigint generated always as identity primary key,
  zaman timestamptz not null default now(),
  durum text not null check (durum in ('basarili', 'hata')),
  boyut_mb numeric,                    -- şifreli yedek dosyasının boyutu
  sha256 text,                         -- şifreli dosyanın özeti (bütünlük kontrolü)
  sifreli boolean,                     -- dosya şifreli mi (şifre çözülüp doğrulandı)
  tablo_sayisi int,                    -- geri yüklenen tablo sayısı
  satir_sayisi bigint,                 -- geri yüklenen toplam satır
  geri_yukleme text check (geri_yukleme in ('basarili', 'fark_var', 'hata')),
  fark jsonb,                          -- satır sayısı canlıdan farklı çıkan tablolar
  aciklama text                        -- kısa durum notu (bağlantı bilgisi ya da şifre içermez)
);
create index if not exists yedek_kayit_zaman_ix on public.yedek_kayit (zaman desc);
alter table public.yedek_kayit enable row level security;
-- yalnız yönetici okur (mevcut benim_rolum() fonksiyonu kullanılır, değiştirilmez); kimse sitede yazamaz, değiştiremez, silemez
create policy yedek_kayit_okuma on public.yedek_kayit for select to authenticated using ((select public.benim_rolum()) = 'yonetici');
revoke all on public.yedek_kayit from public, anon, authenticated;
grant select on public.yedek_kayit to authenticated;
grant select, insert on public.yedek_kayit to service_role;
revoke update, delete, truncate, references, trigger on public.yedek_kayit from service_role;  -- kayıtlar değiştirilemez, silinemez
