-- =====================================================================
-- Perakende Satış & Servis Yönetimi — Supabase şeması
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
-- Tekrar çalıştırılabilir (idempotent).
-- =====================================================================


-- ---------- Tablolar ----------
create table if not exists urunler (
  id uuid primary key default gen_random_uuid(),
  kod text,
  barkod text,
  ad text not null,
  marka text,
  kategori text,
  birim text not null default 'Adet',
  alis_fiyati numeric(14,2) not null default 0,
  satis_fiyati numeric(14,2) not null default 0,
  kdv numeric(5,2) not null default 20,
  stok numeric(14,3) not null default 0,
  kritik_stok numeric(14,3) not null default 0,
  raf text,
  aktif boolean not null default true,
  olusturma timestamptz not null default now()
);
create unique index if not exists urunler_barkod_uq on urunler (barkod) where barkod is not null and barkod <> '';

create table if not exists musteriler (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  telefon text,
  eposta text,
  vergi_no text,
  adres text,
  bakiye numeric(14,2) not null default 0,   -- (+) müşteri bize borçlu
  notlar text,
  olusturma timestamptz not null default now()
);

create table if not exists kasalar (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  tur text not null default 'Nakit',          -- Nakit | Kart/POS | Banka
  bakiye numeric(14,2) not null default 0,
  olusturma timestamptz not null default now()
);

create table if not exists satislar (
  id uuid primary key default gen_random_uuid(),
  no bigserial,
  tarih timestamptz not null default now(),
  musteri_id uuid references musteriler(id) on delete set null,
  musteri_ad text,
  kalemler jsonb not null default '[]',       -- [{urun_id, ad, adet, fiyat, kdv, iskonto}]
  ara_toplam numeric(14,2) not null default 0,
  iskonto numeric(14,2) not null default 0,
  toplam numeric(14,2) not null default 0,
  odeme_turu text not null,                   -- Nakit | Kart | Veresiye | Bolunmus
  odemeler jsonb not null default '[]',       -- [{kasa_id, tutar}]
  veresiye numeric(14,2) not null default 0,
  personel text,
  iptal boolean not null default false,
  notlar text
);

create table if not exists servisler (
  id uuid primary key default gen_random_uuid(),
  no bigserial,
  giris_tarihi timestamptz not null default now(),
  musteri_id uuid references musteriler(id) on delete set null,
  musteri_ad text,
  telefon text,
  cihaz text,                                  -- araç / cihaz bilgisi
  plaka_seri text,
  km text,
  sikayet text,
  yapilan_islem text,
  durum text not null default 'Bekliyor',     -- Bekliyor | İşlemde | Parça Bekleniyor | Hazır | Teslim Edildi | İptal
  teknisyen text,
  parcalar jsonb not null default '[]',       -- [{urun_id, ad, adet, fiyat}]
  iscilik numeric(14,2) not null default 0,
  toplam numeric(14,2) not null default 0,
  teslim_tarihi timestamptz,
  odeme jsonb,                                -- {kasa_id, tutar, veresiye}
  notlar text
);

create table if not exists kasa_hareketleri (
  id uuid primary key default gen_random_uuid(),
  tarih timestamptz not null default now(),
  kasa_id uuid references kasalar(id) on delete cascade,
  tur text not null,                          -- Giriş | Çıkış
  kaynak text not null,                       -- Satış | Servis | Tahsilat | Masraf | Elle
  kaynak_id uuid,
  aciklama text,
  tutar numeric(14,2) not null,
  personel text
);

create table if not exists stok_hareketleri (
  id uuid primary key default gen_random_uuid(),
  tarih timestamptz not null default now(),
  urun_id uuid references urunler(id) on delete cascade,
  tur text not null,                          -- Satış | Servis | Giriş | Sayım | İade
  miktar numeric(14,3) not null,              -- (+) giriş, (-) çıkış
  kaynak_id uuid,
  aciklama text
);

create table if not exists cari_hareketleri (
  id uuid primary key default gen_random_uuid(),
  tarih timestamptz not null default now(),
  musteri_id uuid references musteriler(id) on delete cascade,
  tur text not null,                          -- Borç | Alacak
  kaynak text not null,                       -- Satış | Servis | Tahsilat | Elle
  kaynak_id uuid,
  aciklama text,
  tutar numeric(14,2) not null
);

create table if not exists ayarlar (
  id int primary key default 1,
  firma_adi text default 'İşletmem',
  adres text,
  telefon text,
  vergi text,
  fis_notu text default 'Bizi tercih ettiğiniz için teşekkürler.',
  constraint tek_satir check (id = 1)
);
insert into ayarlar (id) values (1) on conflict do nothing;
insert into kasalar (ad, tur)
  select * from (values ('Kasa','Nakit'),('POS','Kart/POS'),('Banka','Banka')) v(ad,tur)
  where not exists (select 1 from kasalar);

create index if not exists kasa_hareketleri_kasa_idx on kasa_hareketleri (kasa_id);
create index if not exists stok_hareketleri_urun_idx on stok_hareketleri (urun_id);
create index if not exists cari_hareketleri_musteri_idx on cari_hareketleri (musteri_id);
create index if not exists satislar_musteri_idx on satislar (musteri_id);
create index if not exists servisler_musteri_idx on servisler (musteri_id);

-- ---------- Yardımcı fonksiyonlar ----------
create or replace function _kasa_islem(p_kasa uuid, p_tur text, p_kaynak text, p_kaynak_id uuid, p_aciklama text, p_tutar numeric, p_personel text)
returns void language plpgsql set search_path = public as $$
begin
  if p_kasa is null or coalesce(p_tutar,0) = 0 then return; end if;
  update kasalar set bakiye = bakiye + case when p_tur = 'Giriş' then p_tutar else -p_tutar end where id = p_kasa;
  insert into kasa_hareketleri (kasa_id, tur, kaynak, kaynak_id, aciklama, tutar, personel)
  values (p_kasa, p_tur, p_kaynak, p_kaynak_id, p_aciklama, p_tutar, p_personel);
end $$;

create or replace function _cari_islem(p_musteri uuid, p_tur text, p_kaynak text, p_kaynak_id uuid, p_aciklama text, p_tutar numeric)
returns void language plpgsql set search_path = public as $$
begin
  if p_musteri is null or coalesce(p_tutar,0) = 0 then return; end if;
  update musteriler set bakiye = bakiye + case when p_tur = 'Borç' then p_tutar else -p_tutar end where id = p_musteri;
  insert into cari_hareketleri (musteri_id, tur, kaynak, kaynak_id, aciklama, tutar)
  values (p_musteri, p_tur, p_kaynak, p_kaynak_id, p_aciklama, p_tutar);
end $$;

-- ---------- Satış: tek işlemde stok + kasa + cari ----------
create or replace function satis_kaydet(p jsonb)
returns satislar language plpgsql security invoker set search_path = public as $$
declare s satislar; k jsonb; o jsonb;
begin
  insert into satislar (musteri_id, musteri_ad, kalemler, ara_toplam, iskonto, toplam, odeme_turu, odemeler, veresiye, personel, notlar)
  values ((p->>'musteri_id')::uuid, p->>'musteri_ad', p->'kalemler', (p->>'ara_toplam')::numeric, (p->>'iskonto')::numeric,
          (p->>'toplam')::numeric, p->>'odeme_turu', coalesce(p->'odemeler','[]'), coalesce((p->>'veresiye')::numeric,0), p->>'personel', p->>'notlar')
  returning * into s;

  for k in select * from jsonb_array_elements(s.kalemler) loop
    if k->>'urun_id' is not null then
      update urunler set stok = stok - (k->>'adet')::numeric where id = (k->>'urun_id')::uuid;
      insert into stok_hareketleri (urun_id, tur, miktar, kaynak_id, aciklama)
      values ((k->>'urun_id')::uuid, 'Satış', -(k->>'adet')::numeric, s.id, 'Satış #' || s.no);
    end if;
  end loop;

  for o in select * from jsonb_array_elements(s.odemeler) loop
    perform _kasa_islem((o->>'kasa_id')::uuid, 'Giriş', 'Satış', s.id, 'Satış #' || s.no, (o->>'tutar')::numeric, s.personel);
  end loop;

  perform _cari_islem(s.musteri_id, 'Borç', 'Satış', s.id, 'Satış #' || s.no || ' (veresiye)', s.veresiye);
  return s;
end $$;

create or replace function satis_iptal(p_id uuid)
returns void language plpgsql set search_path = public as $$
declare s satislar; k jsonb; o jsonb;
begin
  select * into s from satislar where id = p_id for update;
  if s.iptal then return; end if;
  for k in select * from jsonb_array_elements(s.kalemler) loop
    if k->>'urun_id' is not null then
      update urunler set stok = stok + (k->>'adet')::numeric where id = (k->>'urun_id')::uuid;
      insert into stok_hareketleri (urun_id, tur, miktar, kaynak_id, aciklama)
      values ((k->>'urun_id')::uuid, 'İade', (k->>'adet')::numeric, s.id, 'Satış #' || s.no || ' iptal');
    end if;
  end loop;
  for o in select * from jsonb_array_elements(s.odemeler) loop
    perform _kasa_islem((o->>'kasa_id')::uuid, 'Çıkış', 'Satış', s.id, 'Satış #' || s.no || ' iptal', (o->>'tutar')::numeric, s.personel);
  end loop;
  perform _cari_islem(s.musteri_id, 'Alacak', 'Satış', s.id, 'Satış #' || s.no || ' iptal', s.veresiye);
  update satislar set iptal = true where id = p_id;
end $$;

-- ---------- Servis teslim / geri alma ----------
create or replace function servis_teslim(p_id uuid, p_kasa uuid, p_tutar numeric, p_personel text)
returns void language plpgsql set search_path = public as $$
declare v servisler; k jsonb; ver numeric;
begin
  select * into v from servisler where id = p_id for update;
  if v.durum = 'Teslim Edildi' then return; end if;
  for k in select * from jsonb_array_elements(v.parcalar) loop
    if k->>'urun_id' is not null then
      update urunler set stok = stok - (k->>'adet')::numeric where id = (k->>'urun_id')::uuid;
      insert into stok_hareketleri (urun_id, tur, miktar, kaynak_id, aciklama)
      values ((k->>'urun_id')::uuid, 'Servis', -(k->>'adet')::numeric, v.id, 'Servis #' || v.no);
    end if;
  end loop;
  ver := greatest(v.toplam - coalesce(p_tutar,0), 0);
  perform _kasa_islem(p_kasa, 'Giriş', 'Servis', v.id, 'Servis #' || v.no, p_tutar, p_personel);
  perform _cari_islem(v.musteri_id, 'Borç', 'Servis', v.id, 'Servis #' || v.no || ' (veresiye)', ver);
  update servisler set durum = 'Teslim Edildi', teslim_tarihi = now(),
    odeme = jsonb_build_object('kasa_id', p_kasa, 'tutar', coalesce(p_tutar,0), 'veresiye', ver)
  where id = p_id;
end $$;

create or replace function servis_teslim_geri_al(p_id uuid)
returns void language plpgsql set search_path = public as $$
declare v servisler; k jsonb;
begin
  select * into v from servisler where id = p_id for update;
  if v.durum <> 'Teslim Edildi' then return; end if;
  for k in select * from jsonb_array_elements(v.parcalar) loop
    if k->>'urun_id' is not null then
      update urunler set stok = stok + (k->>'adet')::numeric where id = (k->>'urun_id')::uuid;
      insert into stok_hareketleri (urun_id, tur, miktar, kaynak_id, aciklama)
      values ((k->>'urun_id')::uuid, 'İade', (k->>'adet')::numeric, v.id, 'Servis #' || v.no || ' teslim geri alındı');
    end if;
  end loop;
  perform _kasa_islem((v.odeme->>'kasa_id')::uuid, 'Çıkış', 'Servis', v.id, 'Servis #' || v.no || ' geri alındı', (v.odeme->>'tutar')::numeric, null);
  perform _cari_islem(v.musteri_id, 'Alacak', 'Servis', v.id, 'Servis #' || v.no || ' geri alındı', (v.odeme->>'veresiye')::numeric);
  update servisler set durum = 'Hazır', teslim_tarihi = null, odeme = null where id = p_id;
end $$;

-- ---------- Tahsilat / masraf / stok girişi ----------
create or replace function tahsilat_al(p_musteri uuid, p_kasa uuid, p_tutar numeric, p_aciklama text, p_personel text)
returns void language plpgsql set search_path = public as $$
begin
  perform _cari_islem(p_musteri, 'Alacak', 'Tahsilat', null, coalesce(p_aciklama,'Tahsilat'), p_tutar);
  perform _kasa_islem(p_kasa, 'Giriş', 'Tahsilat', p_musteri, coalesce(p_aciklama,'Tahsilat'), p_tutar, p_personel);
end $$;

create or replace function kasa_elle(p_kasa uuid, p_tur text, p_kaynak text, p_tutar numeric, p_aciklama text, p_personel text)
returns void language plpgsql set search_path = public as $$
begin
  perform _kasa_islem(p_kasa, p_tur, p_kaynak, null, p_aciklama, p_tutar, p_personel);
end $$;

create or replace function stok_duzelt(p_urun uuid, p_miktar numeric, p_tur text, p_aciklama text)
returns void language plpgsql set search_path = public as $$
begin
  update urunler set stok = stok + p_miktar where id = p_urun;
  insert into stok_hareketleri (urun_id, tur, miktar, aciklama) values (p_urun, p_tur, p_miktar, p_aciklama);
end $$;

-- ---------- Güvenlik: sadece giriş yapmış kullanıcılar ----------
do $$ declare t text;
begin
  foreach t in array array['urunler','musteriler','kasalar','satislar','servisler','kasa_hareketleri','stok_hareketleri','cari_hareketleri','ayarlar'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "giris_yapan_tam_yetki" on %I', t);
    execute format('create policy "giris_yapan_tam_yetki" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- İş fonksiyonlarını sadece giriş yapmış kullanıcılar çağırabilsin
do $$ declare f text;
begin
  foreach f in array array['_kasa_islem(uuid,text,text,uuid,text,numeric,text)','_cari_islem(uuid,text,text,uuid,text,numeric)',
    'satis_kaydet(jsonb)','satis_iptal(uuid)','servis_teslim(uuid,uuid,numeric,text)','servis_teslim_geri_al(uuid)',
    'tahsilat_al(uuid,uuid,numeric,text,text)','kasa_elle(uuid,text,text,numeric,text,text)','stok_duzelt(uuid,numeric,text,text)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------- Canlı senkron (birden çok bilgisayar) ----------
do $$ declare t text;
begin
  foreach t in array array['urunler','musteriler','kasalar','satislar','servisler','kasa_hareketleri','ayarlar'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
