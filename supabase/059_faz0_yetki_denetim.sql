-- =====================================================================
-- 059 · FAZ 0 — Yetki sıkılaştırma ve denetim kaydı
-- Veri silmez, veri değiştirmez: yalnız izinleri, görünümleri ve yeni (boş) tabloları kurar.
-- Geri alma: supabase/yedek/059_geri_al.sql
--
-- 1) Rol: kullanicilar tablosu boşalırsa herkesin yönetici sayılması kaldırılır.
-- 2) Personel (kasiyer / teknisyen) alış fiyatı, maliyet, kâr, kasa, banka, cari bakiye ve masrafı
--    VERİTABANI DÜZEYİNDE göremez: ürün, hareket, fatura satırı, fiyat geçmişi ve cari için
--    maliyetsiz "_p" görünümleri okur; ana tabloları yalnız yönetici okur.
-- 3) Yazma: personel yalnız soruldu, teklif, sayım, stok aksiyonu, şase ve rakip notu yazar;
--    ürün, kod, depo, ayar, hareket ve cari yalnız yönetici (BizimHesap eşitlemesi service_role ile çalışır, etkilenmez).
-- 4) anon (giriş yapmamış) tablolara doğrudan erişemez; TRUNCATE / TRIGGER / REFERENCES izinleri kaldırılır.
-- 5) denetim: kullanıcıların yaptığı her ekleme / değişiklik / silme, kim-ne zaman-önce-sonra ile kaydedilir (yalnız eklenir, silinemez).
-- 6) yedek_kayit: gecelik yedek ve geri yükleme testinin sonucu.
-- =====================================================================

-- ---------- 1) rol ----------
create or replace function public.benim_rolum()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select rol from kullanicilar where lower(eposta) = lower(auth.jwt() ->> 'email') and aktif limit 1), 'yok')
$$;
create or replace function public.yonetici_mi()
returns boolean language sql stable security definer set search_path = public as $$ select public.benim_rolum() = 'yonetici' $$;
revoke all on function public.yonetici_mi() from public, anon;
grant execute on function public.yonetici_mi() to authenticated, service_role;

-- ---------- 4) anon ve tehlikeli izinler ----------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke select, insert, update, delete on all tables in schema public from anon;
grant insert on public.istemci_hata to anon;   -- giriş öncesi hata kaydı
-- tetikleyici fonksiyonları dışarıdan çağrılamasın
revoke execute on function public.silineni_kaydet() from public, anon, authenticated;
revoke execute on function public.tedarikci_maliyet_carpan() from public, anon, authenticated;
revoke execute on function public.tedarikci_maliyet_carpan_ekle() from public, anon, authenticated;

-- ---------- 2) personel görünümleri (maliyetsiz) ----------
-- Görünümler sahibinin (postgres) yetkisiyle çalışır; içerideki rol filtresi giriş yapmamış ya da listede olmayanları dışarıda bırakır.
create or replace view public.urunler_p as
  select id, kod, barkod, ad, marka, kategori, birim, null::numeric as alis_fiyati, satis_fiyati, kdv, stok, kritik_stok, raf, aktif,
         olusturma, bh_id, bh_guncelleme, bh_stok, etiket, degisim, gorsel_var
  from public.urunler where (select public.benim_rolum()) <> 'yok';

create or replace view public.hareketler_p as
  select id, tarih, urun_id, tur, miktar, onceki, sonraki, satis_fiyati, null::numeric as alis_fiyati, kdv, yok_say, notlar, degisim
  from public.hareketler where (select public.benim_rolum()) <> 'yok';

-- alış satırlarının tutarları (= bizim maliyetimiz) ve satış satırlarının alış fiyatı gizlenir; adet, tarih, cari, belge kalır
create or replace view public.rapor_satirlari_p as
  select id, tarih, tur, urun_id, urun_ad, kategori, marka, kod, barkod, miktar, birim, null::numeric as alis_fiyati,
         case when tur = 'alis' then null else tutar end as tutar, case when tur = 'alis' then null else indirim end as indirim,
         case when tur = 'alis' then null else net end as net, case when tur = 'alis' then null else kdv end as kdv,
         case when tur = 'alis' then null else toplam end as toplam, yuklendi, gecersiz, belge_guid, cari_guid, cari_ad, kullanici, depo, saat,
         urun_bh_id, kdv_orani, case when tur = 'alis' then null else birim_fiyat end as birim_fiyat, iade, degisim
  from public.rapor_satirlari where (select public.benim_rolum()) <> 'yok';

create or replace view public.fiyat_gecmisi_p as
  select id, tarih, urun_id, null::numeric as alis_eski, null::numeric as alis_yeni, satis_eski, satis_yeni, degisim
  from public.fiyat_gecmisi where (select public.benim_rolum()) <> 'yok';

create or replace view public.cariler_p as
  select id, bh_id, tur, ad, kod, telefon, null::numeric as bakiye, null::numeric as cek_senet, bh_guncelleme
  from public.cariler where (select public.benim_rolum()) <> 'yok';

revoke all on public.urunler_p, public.hareketler_p, public.rapor_satirlari_p, public.fiyat_gecmisi_p, public.cariler_p from public, anon;
grant select on public.urunler_p, public.hareketler_p, public.rapor_satirlari_p, public.fiyat_gecmisi_p, public.cariler_p to authenticated, service_role;

-- ---------- 2-3) ana tablo politikaları ----------
-- yardımcı: bir tablonun tüm politikalarını kaldırıp yenisini kurar
create or replace function pg_temp.pol(t text, okuma text, yazma text) returns void language plpgsql as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
    execute format('drop policy %I on public.%I', p.policyname, t);
  end loop;
  if okuma is not null then execute format('create policy okuma on public.%I for select to authenticated using (%s)', t, okuma); end if;
  if yazma is not null then
    execute format('create policy ekleme on public.%I for insert to authenticated with check (%s)', t, yazma);
    execute format('create policy guncelleme on public.%I for update to authenticated using (%s) with check (%s)', t, yazma, yazma);
    execute format('create policy silme on public.%I for delete to authenticated using (%s)', t, yazma);
  end if;
end $$;

do $$
declare
  y  constant text := '(select public.benim_rolum()) = ''yonetici''';
  hp constant text := '(select public.benim_rolum()) <> ''yok''';
  t text;
begin
  -- maliyet, kâr, kasa, banka, cari: yalnız yönetici (okuma ve yazma)
  foreach t in array array['urunler','hareketler','rapor_satirlari','fiyat_gecmisi','cariler','cari_hareketler','kasa_akisi','masraflar',
      'hesap_bakiyeleri','vadesi_gecen','tahsilat_notlari','tedarikci_carpan','bh_kuyruk',
      'ty_durum','ty_gonderim','ty_kategori_esleme','ty_marka_esleme','ty_onbellek','ty_oto_atla','ty_siparis','ty_urun','ty_yukleme',
      -- eski POS denemesinden kalan boş tablolar (silinmez, kilitlenir)
      'satislar','kasalar','kasa_hareketleri','musteriler','servisler','teklifler','stok_hareketleri','gun_sonu','cari_hareketleri','araclar'] loop
    perform pg_temp.pol(t, y, y);
  end loop;
  -- herkes okur, yalnız yönetici yazar (eşitleme servisleri service_role ile yazar)
  foreach t in array array['ayarlar','bh_durum','depolar','urun_depo_stok','urun_kodlari','otomarmara_veri'] loop
    perform pg_temp.pol(t, hp, y);
  end loop;
  -- personelin günlük işi: herkes okur ve yazar
  foreach t in array array['sorulan','fiyat_teklifleri','sayim','stok_aksiyon','sase_araclar','rakip_not'] loop
    perform pg_temp.pol(t, hp, hp);
  end loop;
end $$;
-- ty_onbellek'te personel yalnız "fiyat_supheli" satırını okuyordu; artık yalnız yönetici okur (Trendyol sayfası yönetici sayfası)
-- tedarikci_katalog, tedarikci_maliyet, bh_alis_log, odeal_fatura, asistan_*, fiyat_degisiklik, eklenti_anahtar zaten yalnız yönetici: dokunulmadı.

-- ---------- 5) denetim kaydı ----------
create table if not exists public.denetim (
  id bigint generated always as identity primary key,
  zaman timestamptz not null default now(),
  kullanici uuid,
  eposta text,
  rol text,
  tablo text not null,
  islem text not null,          -- ekleme | degisiklik | silme
  kayit text,                   -- kaydın anahtarı (id ya da urun_id)
  eski jsonb,                   -- değişiklikte yalnız değişen alanların eski hali; silmede tüm satır
  yeni jsonb                    -- değişiklikte yalnız değişen alanların yeni hali; eklemede tüm satır
);
create index if not exists denetim_zaman_ix on public.denetim (zaman desc);
create index if not exists denetim_kayit_ix on public.denetim (tablo, kayit);
alter table public.denetim enable row level security;
drop policy if exists okuma on public.denetim;
create policy okuma on public.denetim for select to authenticated using ((select public.benim_rolum()) = 'yonetici');
revoke all on public.denetim from public, anon, authenticated;
grant select on public.denetim to authenticated;
grant select, insert on public.denetim to service_role;   -- servisler kendi işlemlerini yazabilsin; değiştirme / silme kimseye yok

create or replace function public.denetim_tg()
returns trigger language plpgsql security definer set search_path = public as $$
declare e jsonb; y jsonb; o jsonb; n jsonb;
begin
  -- yalnız siteye giriş yapmış kullanıcıların işlemleri (BizimHesap / Otomarmara eşitleme servisleri her dakika binlerce satır yazar)
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then return null; end if;
  o := case when tg_op <> 'INSERT' then to_jsonb(old) - 'bh_ham' end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) - 'bh_ham' end;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k.key, o -> k.key), jsonb_object_agg(k.key, n -> k.key) into e, y
      from jsonb_object_keys(n) k(key) where k.key not in ('degisim') and (o -> k.key) is distinct from (n -> k.key);
    if y is null then return null; end if;
  else e := o; y := n; end if;
  insert into public.denetim (kullanici, eposta, rol, tablo, islem, kayit, eski, yeni)
  values (auth.uid(), auth.jwt() ->> 'email', public.benim_rolum(), tg_table_name,
          case tg_op when 'INSERT' then 'ekleme' when 'UPDATE' then 'degisiklik' else 'silme' end,
          coalesce(coalesce(n, o) ->> 'id', coalesce(n, o) ->> 'urun_id'), e, y);
  return null;
end $$;
revoke execute on function public.denetim_tg() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['urunler','urun_kodlari','kullanicilar','ayarlar','hareketler','depolar','cariler','tahsilat_notlari','stok_aksiyon',
      'fiyat_teklifleri','sorulan','sayim','odeal_fatura','tedarikci_carpan','asistan_oneri','asistan_hafiza','sase_araclar','rakip_not','otomarmara_veri'] loop
    execute format('drop trigger if exists denetim_tg on public.%I', t);
    execute format('create trigger denetim_tg after insert or update or delete on public.%I for each row execute function public.denetim_tg()', t);
  end loop;
end $$;

-- ---------- 6) yedek kaydı ----------
create table if not exists public.yedek_kayit (
  id bigint generated always as identity primary key,
  zaman timestamptz not null default now(),
  durum text not null,                 -- basarili | hata
  boyut_mb numeric,
  tablo_sayisi int,
  satir_sayisi bigint,
  geri_yukleme text,                   -- basarili | fark_var | hata
  fark jsonb,                          -- geri yüklenen ile canlı arasında satır sayısı farkı olan tablolar
  aciklama text
);
alter table public.yedek_kayit enable row level security;
drop policy if exists okuma on public.yedek_kayit;
create policy okuma on public.yedek_kayit for select to authenticated using ((select public.benim_rolum()) = 'yonetici');
revoke all on public.yedek_kayit from public, anon, authenticated;
grant select on public.yedek_kayit to authenticated;
grant select, insert on public.yedek_kayit to service_role;

-- 36 saattir başarılı yedek yoksa sabah önerisine yaz (asistan_oneri, 2 günde bir)
create or replace function public.yedek_kontrol()
returns void language plpgsql security definer set search_path = public as $$
declare son timestamptz;
begin
  select max(zaman) into son from yedek_kayit where durum = 'basarili' and geri_yukleme = 'basarili';
  if (son is null or son < now() - interval '36 hours')
     and not exists (select 1 from asistan_oneri where kaynak = 'yedek' and zaman > now() - interval '2 days') then
    insert into asistan_oneri (kaynak, baslik, aciklama, oncelik)
    values ('yedek', 'Veritabanı yedeği alınamadı',
      coalesce('Son başarılı yedek: ' || to_char(son at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI') || '. ', 'Henüz başarılı yedek yok. ')
      || 'GitHub > Actions > "Veritabanı yedeği" işinin son çalışmasına bakın; SUPABASE_DB_URL ve YEDEK_SIFRE sırları girilmiş olmalı.', 1);
  end if;
end $$;
revoke all on function public.yedek_kontrol() from public, anon, authenticated;
select cron.unschedule('yedek-kontrol') where exists (select 1 from cron.job where jobname = 'yedek-kontrol');
select cron.schedule('yedek-kontrol', '10 5 * * *', 'select public.yedek_kontrol()');
