-- =====================================================================
-- 067 · FAZ 2 · F2.1 Aşama A — Yapay (deneme) cari ve alış faturaları
-- YALNIZ TEST ORTAMI (akcan-test ve yerel test veritabanı). Bu dosya HİÇBİR canlı geçiş paketine girmez.
-- Gerçek BizimHesap tablolarına (rapor_satirlari, cariler) yazmaz. Her kimlik DENEME- ile, her unvan "DENEME " ile başlar.
-- Mevcut tablolara yabancı anahtar kurulmaz. Yükleme / temizleme yalnız veritabanı sahibi tarafından çalıştırılır.
-- Geri alma: supabase/yedek/067_geri_al.sql
-- =====================================================================

create table if not exists public.deneme_cari (
  id text primary key check (id like 'DENEME-%'),
  unvan text not null check (unvan like 'DENEME %'),
  vergi_no text, telefon text,
  olusturma timestamptz not null default now()
);

create table if not exists public.deneme_fatura (
  guid text primary key check (guid like 'DENEME-%'),
  cari_id text not null references public.deneme_cari (id),
  depo_id uuid not null,
  fatura_no text,
  tarih date not null,
  saat time,
  ilk_gorulme timestamptz not null,       -- gerçek kaynakta "AKCAN'a ilk yüklenme anı"nın karşılığı
  iskonto_tutar numeric(14,2) not null default 0 check (iskonto_tutar >= 0),
  senaryo text,
  olusturma timestamptz not null default now()
);

create table if not exists public.deneme_fatura_satir (
  id bigint generated always as identity primary key,
  fatura_guid text not null references public.deneme_fatura (guid) on delete cascade,
  sira int not null,
  urun_id uuid,
  urun_ad text,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,4) not null check (birim_fiyat >= 0),
  indirim numeric(14,2) not null default 0 check (indirim >= 0),
  kdv_orani numeric(5,2) not null default 20,
  unique (fatura_guid, sira)
);

do $$ declare t text; begin
  foreach t in array array['deneme_cari', 'deneme_fatura', 'deneme_fatura_satir'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_yonetici', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.benim_rolum() = %L)', t || '_yonetici', t, 'yonetici');
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

-- 3 deneme tedarikçisi + 10 deneme alış faturası (D01–D10, 24 satır). Zamanlar referans kesim anına göre kurulur
-- (öneri 07.11.2026 17:20:05). Kesim kaydı OLUŞTURMAZ. Zaten yüklüyse hiçbir şey yapmaz.
create or replace function public.deneme_veri_yukle(p_referans timestamptz default '2026-11-07 17:20:05+03',
                                                    p_acik_depo uuid default null, p_kapali_depo uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sb uuid; vb uuid; p uuid[]; pa text[]; h uuid; ha text;
  tz constant text := 'Europe/Istanbul';
begin
  if exists (select 1 from deneme_fatura) then
    return jsonb_build_object('ok', true, 'zaten_yuklu', true, 'cari', (select count(*) from deneme_cari),
                              'fatura', (select count(*) from deneme_fatura), 'satir', (select count(*) from deneme_fatura_satir));
  end if;
  sb := coalesce(p_acik_depo, (select id from depolar where ad ilike 'SULTANBEYL%' and aktif order by ad limit 1));
  vb := coalesce(p_kapali_depo, (select id from depolar where ad ilike 'VEL%BABA%' and aktif order by ad limit 1));
  if sb is null or vb is null then raise exception 'Deneme depoları bulunamadı'; end if;
  -- stoklu, aktif ürünler (salt okunur seçim, sabit sıra) ve bir hizmet ürünü
  select array_agg(id order by kod, id), array_agg(ad order by kod, id) into p, pa from (
    select u.id, u.kod, u.ad from urunler u
     where u.aktif and not exists (select 1 from urun_turu t where t.urun_id = u.id and t.tur = 'hizmet')
       and not public.hizmet_adayi_mi(u.ad, u.kategori)
     order by u.kod, u.id limit 20) z;
  if coalesce(array_length(p, 1), 0) < 20 then raise exception 'Deneme için yeterli stoklu ürün yok'; end if;
  select u.id, u.ad into h, ha from urunler u
   where u.aktif and (exists (select 1 from urun_turu t where t.urun_id = u.id and t.tur = 'hizmet')
                      or (not exists (select 1 from urun_turu t where t.urun_id = u.id) and public.hizmet_adayi_mi(u.ad, u.kategori)))
   order by u.kod, u.id limit 1;
  if h is null then raise exception 'Deneme için hizmet ürünü bulunamadı'; end if;

  insert into deneme_cari (id, unvan, telefon) values
    ('DENEME-T1', 'DENEME Tedarikçi A', '0000000001'), ('DENEME-T2', 'DENEME Tedarikçi B', '0000000002'), ('DENEME-T3', 'DENEME Tedarikçi C', '0000000003');

  -- her fatura: referans kesim anına göre dakika farkı (fatura zamanı ve AKCAN'da ilk görülme)
  insert into deneme_fatura (guid, cari_id, depo_id, fatura_no, tarih, saat, ilk_gorulme, iskonto_tutar, senaryo)
  select v.guid, v.cari, v.depo, 'DNM-' || right(v.guid, 3),
         ((p_referans + make_interval(mins => v.dk)) at time zone tz)::date,
         case when v.saatsiz then null else date_trunc('minute', (p_referans + make_interval(mins => v.dk)) at time zone tz)::time end,
         p_referans + make_interval(mins => v.ilk_dk), v.iskonto, v.senaryo
    from (values
      ('DENEME-D01', 'DENEME-T1', sb, -1440, false, -1430,  0, 'S23 kesimden 1 gün önce, önce görülmüş: açılışa dahil'),
      ('DENEME-D02', 'DENEME-T1', sb,    60, false,    70,  0, 'S24 kesimden 1 saat sonra: alış taslağı'),
      ('DENEME-D03', 'DENEME-T2', sb,     5, false,     6,  0, 'S25 kesimden 5 dk sonra: belirsiz'),
      ('DENEME-D04', 'DENEME-T2', sb,     0, true,    120,  0, 'S25 saati yok, tarihi kesim günü: belirsiz'),
      ('DENEME-D05', 'DENEME-T3', sb,  -140, false,   960,  0, 'S26 kesimden önce tarihli, sonra görülmüş: belirsiz'),
      ('DENEME-D06', 'DENEME-T1', sb,  1000, false,  1010,  0, 'S27 tekrar/eşzamanlı aktarım kaynağı'),
      ('DENEME-D07', 'DENEME-T1', sb,  1060, false,  1070,  0, 'S28 sonradan değişen fatura kaynağı'),
      ('DENEME-D08', 'DENEME-T3', vb,  1120, false,  1130,  0, 'S30 Velibaba: depo açılmadı'),
      ('DENEME-D09', 'DENEME-T2', sb,  1180, false,  1190,  0, 'Uyarılar: eşleşmeyen ürün, hizmet, sıfır maliyet'),
      ('DENEME-D10', 'DENEME-T3', sb,  1240, false,  1250, 50, 'S4 fatura altı 50,00 TL iskonto')
    ) v(guid, cari, depo, dk, saatsiz, ilk_dk, iskonto, senaryo);

  insert into deneme_fatura_satir (fatura_guid, sira, urun_id, urun_ad, miktar, birim_fiyat, indirim, kdv_orani) values
    ('DENEME-D01', 1, p[1], pa[1], 2, 100.00, 0, 20), ('DENEME-D01', 2, p[2], pa[2], 1, 250.00, 0, 20),
    ('DENEME-D02', 1, p[3], pa[3], 4, 45.50, 0, 20), ('DENEME-D02', 2, p[4], pa[4], 1, 320.00, 20, 20), ('DENEME-D02', 3, p[5], pa[5], 10, 12.75, 0, 20),
    ('DENEME-D03', 1, p[6], pa[6], 2, 80.00, 0, 20), ('DENEME-D03', 2, p[7], pa[7], 1, 150.00, 0, 20),
    ('DENEME-D04', 1, p[8], pa[8], 3, 60.00, 0, 20), ('DENEME-D04', 2, p[9], pa[9], 1, 90.00, 0, 20),
    ('DENEME-D05', 1, p[10], pa[10], 5, 22.00, 0, 20), ('DENEME-D05', 2, p[11], pa[11], 2, 140.00, 0, 20),
    ('DENEME-D06', 1, p[12], pa[12], 1, 500.00, 0, 20), ('DENEME-D06', 2, p[13], pa[13], 6, 18.40, 0, 20), ('DENEME-D06', 3, p[14], pa[14], 2, 75.00, 5, 20),
    ('DENEME-D07', 1, p[15], pa[15], 3, 33.30, 0, 20), ('DENEME-D07', 2, p[16], pa[16], 1, 410.00, 0, 20),
    ('DENEME-D08', 1, p[17], pa[17], 2, 95.00, 0, 20), ('DENEME-D08', 2, p[18], pa[18], 1, 260.00, 0, 20),
    ('DENEME-D09', 1, null, 'DENEME TANIMSIZ ÜRÜN', 1, 40.00, 0, 20), ('DENEME-D09', 2, h, ha, 1, 150.00, 0, 20), ('DENEME-D09', 3, p[19], pa[19], 2, 0.00, 0, 20),
    ('DENEME-D10', 1, p[20], pa[20], 2, 100.00, 0, 20), ('DENEME-D10', 2, p[1], pa[1], 1, 300.00, 30, 20), ('DENEME-D10', 3, p[2], pa[2], 4, 25.50, 0, 20);

  return jsonb_build_object('ok', true, 'cari', (select count(*) from deneme_cari), 'fatura', (select count(*) from deneme_fatura),
                            'satir', (select count(*) from deneme_fatura_satir), 'acik_depo', sb, 'kapali_depo', vb, 'referans', p_referans);
end $$;

-- yalnız kaynağı deneme olan kayıtları siler (köprü kayıtları, alış taslakları, deneme tedarikçileri, deneme verisi)
create or replace function public.deneme_veri_temizle() returns jsonb
language plpgsql security definer set search_path = public as $$
declare a int; b int; c int; d int;
begin
  perform set_config('akcan.deneme_temizlik', 'on', true);
  delete from alis_taslak where kaynak = 'deneme'; get diagnostics a = row_count;
  delete from kopru_kayit where kaynak = 'deneme'; get diagnostics b = row_count;
  delete from tedarikciler where kaynak = 'deneme'; get diagnostics c = row_count;
  delete from deneme_fatura_satir; delete from deneme_fatura; delete from deneme_cari; get diagnostics d = row_count;
  perform set_config('akcan.deneme_temizlik', '', true);
  return jsonb_build_object('ok', true, 'alis_taslak', a, 'kopru_kayit', b, 'tedarikci', c, 'deneme_cari', d);
end $$;

revoke all on function public.deneme_veri_yukle(timestamptz, uuid, uuid), public.deneme_veri_temizle() from public, anon, authenticated;
