-- =====================================================================
-- 006 — Program BizimHesap analiz paneline dönüşüyor
--  * Satış / servis / teklif / araç / müşteri / kasa modülleri ve tabloları SİLİNİR
--  * Stok değişiminden otomatik satış/alış takibi (hareketler)
--  * Fiyat değişim geçmişi (fiyat_gecmisi)
--  * BizimHesap müşteri ve tedarikçi bakiyeleri (cariler) ve bakiye değişimleri
--  * Sıfıra düşen stokların da güncellenmesi (BizimHesap stoğu 0 olan ürünü listede vermiyor)
-- 005'ten SONRA çalıştırılır. Tekrar çalıştırılabilir.
-- =====================================================================

-- ---------- 1) Eski modülleri kaldır ----------
drop function if exists satis_kaydet(jsonb);
drop function if exists satis_iptal(uuid);
drop function if exists servis_teslim(uuid, uuid, numeric, text, uuid);
drop function if exists servis_teslim(uuid, uuid, numeric, text);
drop function if exists servis_teslim_geri_al(uuid);
drop function if exists tahsilat_al(uuid, uuid, numeric, text, text);
drop function if exists kasa_elle(uuid, text, text, numeric, text, text);
drop function if exists stok_duzelt(uuid, numeric, text, text, uuid);
drop function if exists stok_duzelt(uuid, numeric, text, text);
drop function if exists bh_kuyruk_al(int);
drop function if exists _bh_kuyruga_ekle(text, uuid);
drop function if exists _bh_kuyruk_iptal(text, uuid);
drop function if exists _cari_islem(uuid, text, text, uuid, text, numeric);
drop function if exists _kasa_islem(uuid, text, text, uuid, text, numeric, text);
drop function if exists _depo_stok(uuid, uuid, numeric, text, uuid, text);
drop function if exists bh_stoklari_yaz(jsonb);

drop table if exists bh_kuyruk cascade;
drop table if exists gun_sonu cascade;
drop table if exists teklifler cascade;
drop table if exists araclar cascade;
drop table if exists servisler cascade;
drop table if exists satislar cascade;
drop table if exists cari_hareketleri cascade;
drop table if exists kasa_hareketleri cascade;
drop table if exists stok_hareketleri cascade;
drop table if exists kasalar cascade;
drop table if exists musteriler cascade;

-- ---------- 2) Ayarlar ----------
alter table ayarlar add column if not exists alis_kdv_haric boolean not null default false;  -- BizimHesap alış fiyatları KDV hariç mi?
alter table ayarlar add column if not exists hedef_gun int not null default 30;              -- "kaç günlük stok tutulsun" (alınacak adet hesabı)
alter table bh_durum add column if not exists takip_baslangic timestamptz;
alter table bh_durum add column if not exists cari_sayisi int;
update bh_durum set takip_baslangic = coalesce(takip_baslangic, now()), aktif = false where id = 1;

-- ---------- 3) Stok hareketleri (stok değişiminden türetilir) ----------
alter table urunler add column if not exists bh_stok numeric(14,3);   -- BizimHesap'ın bildirdiği son toplam stok

create table if not exists hareketler (
  id bigint generated always as identity primary key,
  tarih timestamptz not null default now(),
  urun_id uuid not null references urunler(id) on delete cascade,
  tur text not null check (tur in ('satis', 'alis')),     -- stok azaldıysa satış, arttıysa alış
  miktar numeric(14,3) not null,                          -- her zaman pozitif
  onceki numeric(14,3), sonraki numeric(14,3),
  satis_fiyati numeric(14,2) not null default 0,          -- o andaki liste fiyatları
  alis_fiyati numeric(14,2) not null default 0,
  kdv numeric(5,2) not null default 20,
  yok_say boolean not null default false,                 -- sayım/düzeltme ise kullanıcı hariç tutar
  notlar text
);
create index if not exists hareketler_tarih_idx on hareketler (tarih desc);
create index if not exists hareketler_urun_idx on hareketler (urun_id, tarih desc);

create table if not exists fiyat_gecmisi (
  id bigint generated always as identity primary key,
  tarih timestamptz not null default now(),
  urun_id uuid not null references urunler(id) on delete cascade,
  alis_eski numeric(14,2), alis_yeni numeric(14,2),
  satis_eski numeric(14,2), satis_yeni numeric(14,2)
);
create index if not exists fiyat_gecmisi_urun_idx on fiyat_gecmisi (urun_id, tarih desc);

-- Ürünler: [{bh_id, ad, kod, barkod, marka, kategori, birim, alis_fiyati, satis_fiyati, kdv, stok, ham}]
create or replace function bh_urunleri_yaz(p jsonb) returns int
language plpgsql set search_path = public as $$
declare
  r jsonb; n int := 0; c int;
  eski record; yeni_id uuid; yeni_stok numeric; takip timestamptz;
begin
  select takip_baslangic into takip from bh_durum where id = 1;
  for r in select * from jsonb_array_elements(p) loop
    yeni_stok := nullif(r->>'stok', '')::numeric;
    select id, bh_stok, alis_fiyati, satis_fiyati into eski from urunler where bh_id = r->>'bh_id';

    insert into urunler (bh_id, ad, kod, barkod, marka, kategori, birim, alis_fiyati, satis_fiyati, kdv, bh_ham, bh_guncelleme, aktif, bh_stok)
    values (r->>'bh_id', coalesce(nullif(r->>'ad',''), 'Adsız ürün'), nullif(r->>'kod',''),
            case when exists (select 1 from urunler x where x.barkod = r->>'barkod' and x.bh_id is distinct from r->>'bh_id') then null else nullif(r->>'barkod','') end,
            nullif(r->>'marka',''), nullif(r->>'kategori',''), coalesce(nullif(r->>'birim',''), 'Adet'),
            coalesce((r->>'alis_fiyati')::numeric, 0), coalesce((r->>'satis_fiyati')::numeric, 0),
            coalesce((r->>'kdv')::numeric, 20), r->'ham', now(), coalesce(r->'ham'->>'isActive','1') <> '0', yeni_stok)
    on conflict (bh_id) where bh_id is not null do update set
      ad = excluded.ad, kod = excluded.kod,
      barkod = case when exists (select 1 from urunler x where x.barkod = excluded.barkod and x.id <> urunler.id) then urunler.barkod else excluded.barkod end,
      marka = coalesce(excluded.marka, urunler.marka), kategori = coalesce(excluded.kategori, urunler.kategori),
      birim = excluded.birim, alis_fiyati = excluded.alis_fiyati, satis_fiyati = excluded.satis_fiyati, kdv = excluded.kdv,
      bh_ham = excluded.bh_ham, bh_guncelleme = now(), aktif = excluded.aktif, bh_stok = coalesce(excluded.bh_stok, urunler.bh_stok)
    where (urunler.ad, urunler.kod, urunler.barkod, urunler.marka, urunler.kategori, urunler.birim,
           urunler.alis_fiyati, urunler.satis_fiyati, urunler.kdv, urunler.aktif, urunler.bh_stok)
      is distinct from
          (excluded.ad, excluded.kod, coalesce(excluded.barkod, urunler.barkod), coalesce(excluded.marka, urunler.marka),
           coalesce(excluded.kategori, urunler.kategori), excluded.birim, excluded.alis_fiyati, excluded.satis_fiyati, excluded.kdv,
           excluded.aktif, coalesce(excluded.bh_stok, urunler.bh_stok))
    returning id into yeni_id;
    get diagnostics c = row_count;
    n := n + c;
    if c = 0 then continue; end if;

    if eski.id is not null then
      -- stok değiştiyse hareket
      if eski.bh_stok is not null and yeni_stok is not null and yeni_stok <> eski.bh_stok then
        insert into hareketler (urun_id, tur, miktar, onceki, sonraki, satis_fiyati, alis_fiyati, kdv)
        values (eski.id, case when yeni_stok < eski.bh_stok then 'satis' else 'alis' end, abs(yeni_stok - eski.bh_stok), eski.bh_stok, yeni_stok,
                coalesce((r->>'satis_fiyati')::numeric, 0), coalesce((r->>'alis_fiyati')::numeric, 0), coalesce((r->>'kdv')::numeric, 20));
      end if;
      -- fiyat değiştiyse geçmişe yaz
      if (eski.alis_fiyati, eski.satis_fiyati) is distinct from (coalesce((r->>'alis_fiyati')::numeric, 0), coalesce((r->>'satis_fiyati')::numeric, 0)) then
        insert into fiyat_gecmisi (urun_id, alis_eski, alis_yeni, satis_eski, satis_yeni)
        values (eski.id, eski.alis_fiyati, coalesce((r->>'alis_fiyati')::numeric, 0), eski.satis_fiyati, coalesce((r->>'satis_fiyati')::numeric, 0));
      end if;
    elsif takip is not null and coalesce(yeni_stok, 0) > 0 then
      -- takip başladıktan sonra stoklu olarak açılan yeni ürün = alış
      insert into hareketler (urun_id, tur, miktar, onceki, sonraki, satis_fiyati, alis_fiyati, kdv)
      values (yeni_id, 'alis', yeni_stok, 0, yeni_stok, coalesce((r->>'satis_fiyati')::numeric, 0), coalesce((r->>'alis_fiyati')::numeric, 0), coalesce((r->>'kdv')::numeric, 20));
    end if;
  end loop;
  return n;
end $$;

-- Depo stokları: bir deponun TÜM listesi gelir; listede olmayan ürünlerin o depodaki stoğu 0 yapılır
create or replace function bh_depo_stogu_yaz(p_depo_bh text, p jsonb) returns int
language plpgsql set search_path = public as $$
declare d uuid; n int := 0; c int;
begin
  select id into d from depolar where bh_id = p_depo_bh;
  if d is null then return 0; end if;
  with gelen as (
    select u.id urun_id, sum((r->>'miktar')::numeric) miktar
    from jsonb_array_elements(p) r join urunler u on u.bh_id = r->>'urun_bh_id'
    group by u.id
  ), yaz as (
    insert into urun_depo_stok (urun_id, depo_id, miktar)
    select urun_id, d, miktar from gelen
    on conflict (urun_id, depo_id) do update set miktar = excluded.miktar
    where urun_depo_stok.miktar is distinct from excluded.miktar
    returning 1
  )
  select count(*) into n from yaz;
  update urun_depo_stok s set miktar = 0
  where s.depo_id = d and s.miktar <> 0
    and not exists (select 1 from jsonb_array_elements(p) r join urunler u on u.bh_id = r->>'urun_bh_id' where u.id = s.urun_id);
  get diagnostics c = row_count;
  return n + c;
end $$;

-- ---------- 4) Cariler (BizimHesap müşteri / tedarikçi bakiyeleri) ----------
create table if not exists cariler (
  id uuid primary key default gen_random_uuid(),
  bh_id text not null,
  tur text not null check (tur in ('musteri', 'tedarikci')),
  ad text not null,
  kod text, telefon text, eposta text, vergi_no text, vergi_dairesi text, adres text,
  bakiye numeric(14,2) not null default 0,
  cek_senet numeric(14,2) not null default 0,
  bh_guncelleme timestamptz not null default now()
);
create unique index if not exists cariler_uq on cariler (tur, bh_id);

create table if not exists cari_hareketler (
  id bigint generated always as identity primary key,
  tarih timestamptz not null default now(),
  cari_id uuid not null references cariler(id) on delete cascade,
  onceki numeric(14,2) not null, sonraki numeric(14,2) not null, fark numeric(14,2) not null
);
create index if not exists cari_hareketler_idx on cari_hareketler (tarih desc);

create or replace function bh_carileri_yaz(p jsonb) returns int
language plpgsql set search_path = public as $$
declare r jsonb; n int := 0; eski record; yeni numeric;
begin
  for r in select * from jsonb_array_elements(p) loop
    yeni := coalesce((r->>'bakiye')::numeric, 0);
    select id, bakiye into eski from cariler where tur = r->>'tur' and bh_id = r->>'bh_id';
    if eski.id is null then
      insert into cariler (bh_id, tur, ad, kod, telefon, eposta, vergi_no, vergi_dairesi, adres, bakiye, cek_senet)
      values (r->>'bh_id', r->>'tur', coalesce(nullif(r->>'ad',''), 'Adsız'), nullif(r->>'kod',''), nullif(r->>'telefon',''), nullif(r->>'eposta',''),
              nullif(r->>'vergi_no',''), nullif(r->>'vergi_dairesi',''), nullif(r->>'adres',''), yeni, coalesce((r->>'cek_senet')::numeric, 0));
      n := n + 1;
    else
      update cariler set ad = coalesce(nullif(r->>'ad',''), ad), kod = nullif(r->>'kod',''), telefon = nullif(r->>'telefon',''), eposta = nullif(r->>'eposta',''),
        vergi_no = nullif(r->>'vergi_no',''), vergi_dairesi = nullif(r->>'vergi_dairesi',''), adres = nullif(r->>'adres',''),
        bakiye = yeni, cek_senet = coalesce((r->>'cek_senet')::numeric, 0), bh_guncelleme = now()
      where id = eski.id and (bakiye, cek_senet, ad, telefon) is distinct from (yeni, coalesce((r->>'cek_senet')::numeric, 0), coalesce(nullif(r->>'ad',''), ad), nullif(r->>'telefon',''));
      if found then n := n + 1; end if;
      if yeni <> eski.bakiye then
        insert into cari_hareketler (cari_id, onceki, sonraki, fark) values (eski.id, eski.bakiye, yeni, yeni - eski.bakiye);
      end if;
    end if;
  end loop;
  return n;
end $$;

-- ---------- 5) Güvenlik ----------
do $$ declare t text;
begin
  foreach t in array array['hareketler', 'fiyat_gecmisi', 'cariler', 'cari_hareketler'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "giris_yapan_tam_yetki" on %I', t);
    execute format('create policy "giris_yapan_tam_yetki" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

do $$ declare f text;
begin
  foreach f in array array['bh_urunleri_yaz(jsonb)', 'bh_depo_stogu_yaz(text,jsonb)', 'bh_carileri_yaz(jsonb)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------- 6) Canlı senkron ----------
do $$ declare t text;
begin
  foreach t in array array['hareketler', 'cariler'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
