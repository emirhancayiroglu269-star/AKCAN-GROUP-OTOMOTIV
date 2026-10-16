-- =====================================================================
-- 009 — Ayrıntılı fatura satırları (müşteri, kullanıcı, depo, saat), kasa-banka hareketleri,
--       hesap bakiyeleri, vadesi geçen alacaklar, hedef marj
-- 008'den SONRA çalıştırılır. Tekrar çalıştırılabilir.
-- =====================================================================
alter table rapor_satirlari add column if not exists belge_guid text;
alter table rapor_satirlari add column if not exists cari_guid text;
alter table rapor_satirlari add column if not exists cari_ad text;
alter table rapor_satirlari add column if not exists kullanici text;
alter table rapor_satirlari add column if not exists depo text;
alter table rapor_satirlari add column if not exists saat time;
alter table rapor_satirlari add column if not exists urun_bh_id text;
alter table rapor_satirlari add column if not exists kdv_orani numeric(5,2);
alter table rapor_satirlari add column if not exists birim_fiyat numeric(14,4);
create index if not exists rapor_satirlari_cari_idx on rapor_satirlari (cari_guid);
alter table ayarlar add column if not exists hedef_marj numeric(5,2) not null default 35;

-- BizimHesap /api/report/getsalesreport ve /api/report/GetPurchaseReport satırları; tarih aralığı yenilenir
create or replace function bh_fatura_yukle(p_anahtar text, p_tur text, p_bas date, p_bit date, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then
    raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı';
  end if;
  if p_tur not in ('satis', 'alis') then raise exception 'tur'; end if;
  update rapor_satirlari set gecersiz = true where tur = p_tur and tarih between p_bas and p_bit and not gecersiz;
  insert into rapor_satirlari (tarih, tur, urun_id, urun_bh_id, urun_ad, kategori, marka, kod, barkod, miktar, birim, alis_fiyati, birim_fiyat,
                               tutar, indirim, net, kdv, kdv_orani, toplam, belge_guid, cari_guid, cari_ad, kullanici, depo, saat)
  select (r->>'tarih')::date, p_tur,
    coalesce((select u.id from urunler u where u.bh_id = r->>'urun_bh_id' limit 1),
             (select u.id from urunler u where nullif(r->>'barkod','') is not null and u.barkod = r->>'barkod' limit 1)),
    nullif(r->>'urun_bh_id',''), r->>'ad', nullif(r->>'kategori',''), nullif(r->>'marka',''), nullif(r->>'kod',''), nullif(r->>'barkod',''),
    coalesce((r->>'miktar')::numeric, 0), nullif(r->>'birim',''), (r->>'alis')::numeric, (r->>'birim_fiyat')::numeric,
    (r->>'tutar')::numeric, (r->>'indirim')::numeric, (r->>'net')::numeric, (r->>'kdv')::numeric, (r->>'kdv_orani')::numeric, (r->>'toplam')::numeric,
    nullif(r->>'belge',''), nullif(r->>'cari_guid',''), nullif(r->>'cari',''), nullif(r->>'kullanici',''), nullif(r->>'depo',''), nullif(r->>'saat','')::time
  from jsonb_array_elements(p) r
  where nullif(r->>'tarih','') is not null and nullif(r->>'ad','') is not null;
  get diagnostics n = row_count;
  update bh_durum set rapor_ilk = least(coalesce(rapor_ilk, p_bas), p_bas), rapor_son = greatest(coalesce(rapor_son, p_bit), p_bit), rapor_yukleme = now() where id = 1;
  return n;
end $$;
revoke execute on function bh_fatura_yukle(text, text, date, date, jsonb) from public;
grant execute on function bh_fatura_yukle(text, text, date, date, jsonb) to anon, authenticated, service_role;

create table if not exists kasa_akisi (
  id bigint generated always as identity primary key,
  tarih date not null, tip text, hesap text, kullanici text, karsi text, aciklama text,
  giris numeric(14,2) not null default 0, cikis numeric(14,2) not null default 0,
  gecersiz boolean not null default false, yuklendi timestamptz not null default now()
);
create index if not exists kasa_akisi_tarih_idx on kasa_akisi (tarih desc);
create table if not exists hesap_bakiyeleri (ad text primary key, bakiye numeric(14,2) not null default 0, guncelleme timestamptz not null default now());
create table if not exists vadesi_gecen (
  id bigint generated always as identity primary key,
  cari text, cari_guid text, telefon text, tutar numeric(14,2), vade date, gun int, gecersiz boolean not null default false, yuklendi timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['kasa_akisi','hesap_bakiyeleri','vadesi_gecen'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'giris_yapan_okur') then
      execute format('create policy "giris_yapan_okur" on %I for select to authenticated using (true)', t);
    end if;
    begin execute format('alter publication supabase_realtime add table %I', t); exception when duplicate_object then null; end;
  end loop;
end $$;

create or replace function bh_kasa_yukle(p_anahtar text, p_bas date, p_bit date, p jsonb, p_hesaplar jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı'; end if;
  update kasa_akisi set gecersiz = true where tarih between p_bas and p_bit and not gecersiz;
  insert into kasa_akisi (tarih, tip, hesap, kullanici, karsi, aciklama, giris, cikis)
  select (r->>'tarih')::date, r->>'tip', r->>'hesap', r->>'kullanici', r->>'karsi', r->>'aciklama', coalesce((r->>'giris')::numeric,0), coalesce((r->>'cikis')::numeric,0)
  from jsonb_array_elements(p) r where nullif(r->>'tarih','') is not null;
  get diagnostics n = row_count;
  if p_hesaplar is not null and jsonb_array_length(p_hesaplar) > 0 then
    insert into hesap_bakiyeleri (ad, bakiye, guncelleme)
    select r->>'ad', (r->>'bakiye')::numeric, now() from jsonb_array_elements(p_hesaplar) r
    on conflict (ad) do update set bakiye = excluded.bakiye, guncelleme = now();
  end if;
  return n;
end $$;
create or replace function bh_vadesi_gecen_yukle(p_anahtar text, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı'; end if;
  update vadesi_gecen set gecersiz = true where not gecersiz;
  insert into vadesi_gecen (cari, cari_guid, telefon, tutar, vade, gun)
  select r->>'cari', nullif(r->>'cari_guid',''), nullif(r->>'telefon',''), (r->>'tutar')::numeric, nullif(r->>'vade','')::date, nullif(r->>'gun','')::int
  from jsonb_array_elements(p) r;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function bh_kasa_yukle(text, date, date, jsonb, jsonb) from public;
revoke execute on function bh_vadesi_gecen_yukle(text, jsonb) from public;
grant execute on function bh_kasa_yukle(text, date, date, jsonb, jsonb) to anon, authenticated, service_role;
grant execute on function bh_vadesi_gecen_yukle(text, jsonb) to anon, authenticated, service_role;
