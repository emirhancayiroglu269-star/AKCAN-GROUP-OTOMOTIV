-- =====================================================================
-- 016 — İade belgeleri: alış iadesi (BizimHesap belge türü 7) ve satış iadesi (türü 9).
-- rapor_satirlari'nda iade=true ile tutulur (alış iadesi tur='alis', satış iadesi tur='satis').
-- Fatura yüklemesi yalnız fatura satırlarını, iade yüklemesi yalnız iade satırlarını yeniler.
-- =====================================================================
alter table rapor_satirlari add column if not exists iade boolean not null default false;

create or replace function bh_fatura_yukle(p_anahtar text, p_tur text, p_bas date, p_bit date, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then
    raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı';
  end if;
  if p_tur not in ('satis', 'alis') then raise exception 'tur'; end if;
  update rapor_satirlari set gecersiz = true where tur = p_tur and tarih between p_bas and p_bit and not gecersiz and not iade;
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

create or replace function bh_iade_yukle(p_anahtar text, p_tur text, p_bas date, p_bit date, p jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from aktarim_anahtari where anahtar = p_anahtar and son > now()) then
    raise exception 'Geçersiz veya süresi dolmuş aktarım anahtarı';
  end if;
  if p_tur not in ('satis', 'alis') then raise exception 'tur'; end if;
  update rapor_satirlari set gecersiz = true where tur = p_tur and tarih between p_bas and p_bit and not gecersiz and iade;
  insert into rapor_satirlari (tarih, tur, iade, urun_id, urun_bh_id, urun_ad, kategori, marka, kod, barkod, miktar, birim, alis_fiyati, birim_fiyat,
                               tutar, indirim, net, kdv, kdv_orani, toplam, belge_guid, cari_guid, cari_ad, kullanici, depo, saat)
  select (r->>'tarih')::date, p_tur, true,
    coalesce((select u.id from urunler u where u.bh_id = r->>'urun_bh_id' limit 1),
             (select u.id from urunler u where nullif(r->>'barkod','') is not null and u.barkod = r->>'barkod' limit 1)),
    nullif(r->>'urun_bh_id',''), r->>'ad', nullif(r->>'kategori',''), nullif(r->>'marka',''), nullif(r->>'kod',''), nullif(r->>'barkod',''),
    coalesce((r->>'miktar')::numeric, 0), nullif(r->>'birim',''), (r->>'alis')::numeric, (r->>'birim_fiyat')::numeric,
    (r->>'tutar')::numeric, (r->>'indirim')::numeric, (r->>'net')::numeric, (r->>'kdv')::numeric, (r->>'kdv_orani')::numeric, (r->>'toplam')::numeric,
    nullif(r->>'belge',''), nullif(r->>'cari_guid',''), nullif(r->>'cari',''), nullif(r->>'kullanici',''), nullif(r->>'depo',''), nullif(r->>'saat','')::time
  from jsonb_array_elements(p) r
  where nullif(r->>'tarih','') is not null and nullif(r->>'ad','') is not null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function bh_iade_yukle(text, text, date, date, jsonb) from public;
grant execute on function bh_iade_yukle(text, text, date, date, jsonb) to anon, authenticated, service_role;
