-- =====================================================================
-- 002 — BizimHesap entegrasyonu: depolar, depo bazlı stok, gönderim kuyruğu
-- schema.sql'den SONRA çalıştırılır. Tekrar çalıştırılabilir.
-- =====================================================================

-- ---------- Depolar ve depo bazlı stok ----------
create table if not exists depolar (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  bh_id text unique,
  aktif boolean not null default true,
  olusturma timestamptz not null default now()
);
insert into depolar (ad) select 'Ana Depo' where not exists (select 1 from depolar);

create table if not exists urun_depo_stok (
  urun_id uuid not null references urunler(id) on delete cascade,
  depo_id uuid not null references depolar(id) on delete cascade,
  miktar numeric(14,3) not null default 0,
  primary key (urun_id, depo_id)
);
create index if not exists urun_depo_stok_depo_idx on urun_depo_stok (depo_id);

alter table urunler add column if not exists bh_id text;
alter table urunler add column if not exists bh_ham jsonb;
alter table urunler add column if not exists bh_guncelleme timestamptz;
create unique index if not exists urunler_bh_id_uq on urunler (bh_id) where bh_id is not null;

alter table satislar add column if not exists depo_id uuid references depolar(id) on delete set null;
alter table servisler add column if not exists depo_id uuid references depolar(id) on delete set null;
alter table stok_hareketleri add column if not exists depo_id uuid references depolar(id) on delete set null;
create index if not exists satislar_depo_idx on satislar (depo_id);
create index if not exists servisler_depo_idx on servisler (depo_id);
create index if not exists stok_hareketleri_depo_idx on stok_hareketleri (depo_id);

-- Mevcut stokları varsayılan depoya taşı (bir kerelik)
insert into urun_depo_stok (urun_id, depo_id, miktar)
select u.id, (select id from depolar order by olusturma limit 1), u.stok
from urunler u
where u.stok <> 0 and not exists (select 1 from urun_depo_stok s where s.urun_id = u.id);

-- urunler.stok = tüm depoların toplamı (otomatik)
create or replace function _urun_stok_topla() returns trigger
language plpgsql set search_path = public as $$
declare u uuid;
begin
  u := coalesce(new.urun_id, old.urun_id);
  update urunler set stok = coalesce((select sum(miktar) from urun_depo_stok where urun_id = u), 0) where id = u;
  if tg_op = 'UPDATE' and old.urun_id <> new.urun_id then
    update urunler set stok = coalesce((select sum(miktar) from urun_depo_stok where urun_id = old.urun_id), 0) where id = old.urun_id;
  end if;
  return null;
end $$;
drop trigger if exists urun_depo_stok_topla on urun_depo_stok;
create trigger urun_depo_stok_topla after insert or update or delete on urun_depo_stok
  for each row execute function _urun_stok_topla();


-- Yeni ürün açılış stoğuyla eklenirse varsayılan depoya yaz
create or replace function _urun_acilis_stogu() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(new.stok, 0) <> 0 and not exists (select 1 from urun_depo_stok where urun_id = new.id) then
    insert into urun_depo_stok (urun_id, depo_id, miktar) values (new.id, _varsayilan_depo(), new.stok);
    insert into stok_hareketleri (urun_id, depo_id, tur, miktar, aciklama) values (new.id, _varsayilan_depo(), 'Giriş', new.stok, 'Açılış stoğu');
  end if;
  return null;
end $$;
drop trigger if exists urun_acilis_stogu on urunler;
create trigger urun_acilis_stogu after insert on urunler for each row execute function _urun_acilis_stogu();

-- ---------- BizimHesap durum ve kuyruk ----------
create table if not exists bh_durum (
  id int primary key default 1,
  aktif boolean not null default false,          -- true: satışlar BizimHesap'a gönderilir
  son_esitleme timestamptz,
  son_hata text,
  urun_sayisi int,
  depo_sayisi int,
  ham_ornek jsonb,                                -- API'den gelen ilk kayıtlar (alan adlarını doğrulamak için)
  constraint bh_tek_satir check (id = 1)
);
insert into bh_durum (id) values (1) on conflict do nothing;
-- Müşteri seçilmeyen satışların gideceği BizimHesap carisi (BizimHesap müşteri kimliği + adı)
alter table bh_durum add column if not exists perakende_musteri_kodu text default '48A7630F2E474FA4AB78755C806C5704';
alter table bh_durum add column if not exists perakende_musteri_adi text default 'PERAKENDE CARİ';

create table if not exists bh_kuyruk (
  id uuid primary key default gen_random_uuid(),
  olusturma timestamptz not null default now(),
  tur text not null,                              -- satis | servis
  kaynak_id uuid not null,
  durum text not null default 'bekliyor',         -- bekliyor | gonderiliyor | gonderildi (BH'de taslak) | faturalasti | hata | iptal | manuel_iptal
  deneme int not null default 0,
  hata text,
  bh_guid text,
  bh_url text,
  gonderim timestamptz,
  unique (tur, kaynak_id)
);
create index if not exists bh_kuyruk_durum_idx on bh_kuyruk (durum);

-- ---------- Yardımcılar ----------
create or replace function _varsayilan_depo() returns uuid
language sql stable set search_path = public as $$
  select id from depolar where aktif order by (bh_id is null), olusturma limit 1
$$;

create or replace function _depo_stok(p_urun uuid, p_depo uuid, p_delta numeric, p_tur text, p_kaynak uuid, p_aciklama text)
returns void language plpgsql set search_path = public as $$
declare d uuid := coalesce(p_depo, _varsayilan_depo());
begin
  if p_urun is null or coalesce(p_delta, 0) = 0 then return; end if;
  insert into urun_depo_stok (urun_id, depo_id, miktar) values (p_urun, d, p_delta)
  on conflict (urun_id, depo_id) do update set miktar = urun_depo_stok.miktar + excluded.miktar;
  insert into stok_hareketleri (urun_id, depo_id, tur, miktar, kaynak_id, aciklama)
  values (p_urun, d, p_tur, p_delta, p_kaynak, p_aciklama);
end $$;

create or replace function _bh_kuyruga_ekle(p_tur text, p_id uuid) returns void
language plpgsql set search_path = public as $$
begin
  if not (select aktif from bh_durum where id = 1) then return; end if;
  insert into bh_kuyruk (tur, kaynak_id) values (p_tur, p_id)
  on conflict (tur, kaynak_id) do update set durum = 'bekliyor', deneme = 0, hata = null;
end $$;

create or replace function _bh_kuyruk_iptal(p_tur text, p_id uuid) returns void
language plpgsql set search_path = public as $$
begin
  update bh_kuyruk set durum = case when durum in ('gonderildi','faturalasti') then 'manuel_iptal' else 'iptal' end
  where tur = p_tur and kaynak_id = p_id and durum <> 'iptal';
end $$;

-- ---------- Satış / iptal (depo bazlı) ----------
create or replace function satis_kaydet(p jsonb)
returns satislar language plpgsql security invoker set search_path = public as $$
declare s satislar; k jsonb; o jsonb;
begin
  insert into satislar (musteri_id, musteri_ad, kalemler, ara_toplam, iskonto, toplam, odeme_turu, odemeler, veresiye, personel, notlar, depo_id)
  values ((p->>'musteri_id')::uuid, p->>'musteri_ad', p->'kalemler', (p->>'ara_toplam')::numeric, (p->>'iskonto')::numeric,
          (p->>'toplam')::numeric, p->>'odeme_turu', coalesce(p->'odemeler','[]'), coalesce((p->>'veresiye')::numeric,0),
          p->>'personel', p->>'notlar', coalesce((p->>'depo_id')::uuid, _varsayilan_depo()))
  returning * into s;
  for k in select * from jsonb_array_elements(s.kalemler) loop
    perform _depo_stok((k->>'urun_id')::uuid, s.depo_id, -(k->>'adet')::numeric, 'Satış', s.id, 'Satış #' || s.no);
  end loop;
  for o in select * from jsonb_array_elements(s.odemeler) loop
    perform _kasa_islem((o->>'kasa_id')::uuid, 'Giriş', 'Satış', s.id, 'Satış #' || s.no, (o->>'tutar')::numeric, s.personel);
  end loop;
  perform _cari_islem(s.musteri_id, 'Borç', 'Satış', s.id, 'Satış #' || s.no || ' (veresiye)', s.veresiye);
  perform _bh_kuyruga_ekle('satis', s.id);
  return s;
end $$;

create or replace function satis_iptal(p_id uuid)
returns void language plpgsql set search_path = public as $$
declare s satislar; k jsonb; o jsonb;
begin
  select * into s from satislar where id = p_id for update;
  if s.iptal then return; end if;
  for k in select * from jsonb_array_elements(s.kalemler) loop
    perform _depo_stok((k->>'urun_id')::uuid, s.depo_id, (k->>'adet')::numeric, 'İade', s.id, 'Satış #' || s.no || ' iptal');
  end loop;
  for o in select * from jsonb_array_elements(s.odemeler) loop
    perform _kasa_islem((o->>'kasa_id')::uuid, 'Çıkış', 'Satış', s.id, 'Satış #' || s.no || ' iptal', (o->>'tutar')::numeric, s.personel);
  end loop;
  perform _cari_islem(s.musteri_id, 'Alacak', 'Satış', s.id, 'Satış #' || s.no || ' iptal', s.veresiye);
  update satislar set iptal = true where id = p_id;
  perform _bh_kuyruk_iptal('satis', p_id);
end $$;

-- ---------- Servis teslim / geri alma (depo bazlı) ----------
drop function if exists servis_teslim(uuid, uuid, numeric, text);
create or replace function servis_teslim(p_id uuid, p_kasa uuid, p_tutar numeric, p_personel text, p_depo uuid default null)
returns void language plpgsql set search_path = public as $$
declare v servisler; k jsonb; ver numeric; d uuid;
begin
  select * into v from servisler where id = p_id for update;
  if v.durum = 'Teslim Edildi' then return; end if;
  d := coalesce(p_depo, v.depo_id, _varsayilan_depo());
  for k in select * from jsonb_array_elements(v.parcalar) loop
    perform _depo_stok((k->>'urun_id')::uuid, d, -(k->>'adet')::numeric, 'Servis', v.id, 'Servis #' || v.no);
  end loop;
  ver := greatest(v.toplam - coalesce(p_tutar,0), 0);
  perform _kasa_islem(p_kasa, 'Giriş', 'Servis', v.id, 'Servis #' || v.no, p_tutar, p_personel);
  perform _cari_islem(v.musteri_id, 'Borç', 'Servis', v.id, 'Servis #' || v.no || ' (veresiye)', ver);
  update servisler set durum = 'Teslim Edildi', teslim_tarihi = now(), depo_id = d,
    odeme = jsonb_build_object('kasa_id', p_kasa, 'tutar', coalesce(p_tutar,0), 'veresiye', ver)
  where id = p_id;
  perform _bh_kuyruga_ekle('servis', p_id);
end $$;

create or replace function servis_teslim_geri_al(p_id uuid)
returns void language plpgsql set search_path = public as $$
declare v servisler; k jsonb;
begin
  select * into v from servisler where id = p_id for update;
  if v.durum <> 'Teslim Edildi' then return; end if;
  for k in select * from jsonb_array_elements(v.parcalar) loop
    perform _depo_stok((k->>'urun_id')::uuid, v.depo_id, (k->>'adet')::numeric, 'İade', v.id, 'Servis #' || v.no || ' teslim geri alındı');
  end loop;
  perform _kasa_islem((v.odeme->>'kasa_id')::uuid, 'Çıkış', 'Servis', v.id, 'Servis #' || v.no || ' geri alındı', (v.odeme->>'tutar')::numeric, null);
  perform _cari_islem(v.musteri_id, 'Alacak', 'Servis', v.id, 'Servis #' || v.no || ' geri alındı', (v.odeme->>'veresiye')::numeric);
  update servisler set durum = 'Hazır', teslim_tarihi = null, odeme = null where id = p_id;
  perform _bh_kuyruk_iptal('servis', p_id);
end $$;

-- ---------- Elle stok (depo bazlı) ----------
drop function if exists stok_duzelt(uuid, numeric, text, text);
create or replace function stok_duzelt(p_urun uuid, p_miktar numeric, p_tur text, p_aciklama text, p_depo uuid default null)
returns void language plpgsql set search_path = public as $$
begin
  perform _depo_stok(p_urun, p_depo, p_miktar, p_tur, null, p_aciklama);
end $$;

-- ---------- Eşitleme servisinin kullandığı fonksiyonlar ----------
-- Depolar: [{bh_id, ad}]
create or replace function bh_depolari_yaz(p jsonb) returns int
language plpgsql set search_path = public as $$
declare r jsonb; n int := 0;
begin
  for r in select * from jsonb_array_elements(p) loop
    insert into depolar (ad, bh_id) values (r->>'ad', r->>'bh_id')
    on conflict (bh_id) do update set ad = excluded.ad, aktif = true;
    n := n + 1;
  end loop;
  -- BizimHesap depoları geldiyse, stoğu olmayan yerel varsayılan depoyu gizle
  if n > 0 then
    update depolar d set aktif = false
    where d.bh_id is null and not exists (select 1 from urun_depo_stok s where s.depo_id = d.id and s.miktar <> 0);
  end if;
  return n;
end $$;

-- Ürünler: [{bh_id, ad, kod, barkod, marka, kategori, birim, alis_fiyati, satis_fiyati, kdv, ham}]
create or replace function bh_urunleri_yaz(p jsonb) returns int
language plpgsql set search_path = public as $$
declare r jsonb; n int := 0; c int;
begin
  for r in select * from jsonb_array_elements(p) loop
    -- Daha önce barkodla elle açılmış ürün varsa onu BizimHesap kaydına bağla
    update urunler set bh_id = r->>'bh_id'
    where bh_id is null and nullif(r->>'barkod','') is not null and barkod = r->>'barkod'
      and not exists (select 1 from urunler x where x.bh_id = r->>'bh_id');

    insert into urunler (bh_id, ad, kod, barkod, marka, kategori, birim, alis_fiyati, satis_fiyati, kdv, bh_ham, bh_guncelleme, aktif)
    values (r->>'bh_id', coalesce(nullif(r->>'ad',''), 'Adsız ürün'), nullif(r->>'kod',''),
            case when exists (select 1 from urunler x where x.barkod = r->>'barkod' and x.bh_id is distinct from r->>'bh_id') then null else nullif(r->>'barkod','') end,
            nullif(r->>'marka',''), nullif(r->>'kategori',''), coalesce(nullif(r->>'birim',''), 'Adet'),
            coalesce((r->>'alis_fiyati')::numeric, 0), coalesce((r->>'satis_fiyati')::numeric, 0),
            coalesce((r->>'kdv')::numeric, 20), r->'ham', now(), coalesce(r->'ham'->>'isActive','1') <> '0')
    on conflict (bh_id) where bh_id is not null do update set
      ad = excluded.ad, kod = excluded.kod,
      barkod = case when exists (select 1 from urunler x where x.barkod = excluded.barkod and x.id <> urunler.id) then urunler.barkod else excluded.barkod end,
      marka = coalesce(excluded.marka, urunler.marka), kategori = coalesce(excluded.kategori, urunler.kategori),
      birim = excluded.birim, alis_fiyati = excluded.alis_fiyati, satis_fiyati = excluded.satis_fiyati, kdv = excluded.kdv,
      bh_ham = excluded.bh_ham, bh_guncelleme = now(), aktif = excluded.aktif
    -- Sadece gerçekten değişen ürünleri yaz (gereksiz canlı güncelleme olmasın)
    where (urunler.ad, urunler.kod, urunler.barkod, urunler.marka, urunler.kategori, urunler.birim,
           urunler.alis_fiyati, urunler.satis_fiyati, urunler.kdv, urunler.aktif)
      is distinct from
          (excluded.ad, excluded.kod, coalesce(excluded.barkod, urunler.barkod), coalesce(excluded.marka, urunler.marka),
           coalesce(excluded.kategori, urunler.kategori), excluded.birim, excluded.alis_fiyati, excluded.satis_fiyati, excluded.kdv, excluded.aktif);
    get diagnostics c = row_count;
    n := n + c;
  end loop;
  return n;
end $$;

-- Stok: [{urun_bh_id, depo_bh_id, miktar}]
-- Yerel stok = BizimHesap stoğu − henüz BizimHesap'a gönderilmemiş satış/servis miktarları
create or replace function bh_stoklari_yaz(p jsonb) returns int
language plpgsql set search_path = public as $$
declare n int := 0;
begin
  with gelen as (
    select u.id urun_id, d.id depo_id, sum((r->>'miktar')::numeric) miktar
    from jsonb_array_elements(p) r
    join urunler u on u.bh_id = r->>'urun_bh_id'
    join depolar d on d.bh_id = r->>'depo_bh_id'
    group by u.id, d.id
  ),
  bekleyen as (
    select (k->>'urun_id')::uuid urun_id, s.depo_id, sum((k->>'adet')::numeric) adet
    from bh_kuyruk q join satislar s on q.tur = 'satis' and s.id = q.kaynak_id
    cross join lateral jsonb_array_elements(s.kalemler) k
    where q.durum in ('bekliyor','hata','gonderiliyor','gonderildi') and k->>'urun_id' is not null
    group by 1, 2
    union all
    select (k->>'urun_id')::uuid, v.depo_id, sum((k->>'adet')::numeric)
    from bh_kuyruk q join servisler v on q.tur = 'servis' and v.id = q.kaynak_id
    cross join lateral jsonb_array_elements(v.parcalar) k
    where q.durum in ('bekliyor','hata','gonderiliyor','gonderildi') and k->>'urun_id' is not null
    group by 1, 2
  ),
  hedef as (
    select g.urun_id, g.depo_id, g.miktar - coalesce((select sum(b.adet) from bekleyen b where b.urun_id = g.urun_id and b.depo_id = g.depo_id), 0) miktar
    from gelen g
  ),
  yaz as (
    insert into urun_depo_stok (urun_id, depo_id, miktar)
    select urun_id, depo_id, miktar from hedef
    on conflict (urun_id, depo_id) do update set miktar = excluded.miktar
    where urun_depo_stok.miktar is distinct from excluded.miktar
    returning 1
  )
  select count(*) into n from yaz;
  return n;
end $$;

-- Gönderilecek kayıtları kilitleyerek al (aynı anda iki eşitleme çalışırsa çift gönderimi önler)
create or replace function bh_kuyruk_al(p_limit int default 25) returns setof bh_kuyruk
language plpgsql set search_path = public as $$
begin
  update bh_kuyruk set durum = 'hata', hata = 'Gönderim yarıda kaldı, tekrar denenecek'
  where durum = 'gonderiliyor' and gonderim < now() - interval '10 minutes';
  return query
  update bh_kuyruk q set durum = 'gonderiliyor', deneme = q.deneme + 1, gonderim = now()
  where q.id in (
    select id from bh_kuyruk where durum in ('bekliyor','hata') and deneme < 5
    order by olusturma limit p_limit for update skip locked)
  returning q.*;
end $$;

-- ---------- Güvenlik ----------
do $$ declare t text;
begin
  foreach t in array array['depolar','urun_depo_stok','bh_durum','bh_kuyruk'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "giris_yapan_tam_yetki" on %I', t);
    execute format('create policy "giris_yapan_tam_yetki" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

do $$ declare f text;
begin
  foreach f in array array['_urun_stok_topla()','_urun_acilis_stogu()','_varsayilan_depo()','_depo_stok(uuid,uuid,numeric,text,uuid,text)',
    '_bh_kuyruga_ekle(text,uuid)','_bh_kuyruk_iptal(text,uuid)','satis_kaydet(jsonb)','satis_iptal(uuid)',
    'servis_teslim(uuid,uuid,numeric,text,uuid)','servis_teslim_geri_al(uuid)','stok_duzelt(uuid,numeric,text,text,uuid)',
    'bh_depolari_yaz(jsonb)','bh_urunleri_yaz(jsonb)','bh_stoklari_yaz(jsonb)','bh_kuyruk_al(int)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- ---------- Canlı senkron ----------
do $$ declare t text;
begin
  foreach t in array array['depolar','urun_depo_stok','bh_durum','bh_kuyruk'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
