-- Asistanın veri araçları: sabit, SALT-OKUNUR sorgular. Yalnız service_role (asistan edge function) çağırabilir.
create or replace function public.asistan_veri(p_arac text, p jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g int := least(greatest(coalesce((p->>'gun')::int, 7), 1), 365);
  lim int := least(greatest(coalesce((p->>'limit')::int, 10), 1), 30);
  q text := trim(coalesce(p->>'sorgu', p->>'kod', ''));
  n text := upper(regexp_replace(coalesce(p->>'kod', p->>'sorgu', ''), '[^A-Za-z0-9]', '', 'g'));
  r jsonb;
begin
  if p_arac = 'satis_ozet' then
    select jsonb_build_object('son_gun', g, 'satis_kdv_dahil', round(coalesce(sum(toplam),0)), 'satis_kdv_haric', round(coalesce(sum(net),0)),
      'brut_kar_kdv_haric', round(coalesce(sum(net - miktar * coalesce(alis_fiyati, 0)),0)), 'fis', count(distinct belge_guid), 'kalem', count(*),
      'gunluk', case when g <= 31 then (select jsonb_agg(x order by x->>'tarih') from (select jsonb_build_object('tarih', tarih, 'kdv_dahil', round(sum(toplam)), 'fis', count(distinct belge_guid)) x
        from rapor_satirlari where tur = 'satis' and not coalesce(gecersiz, false) and tarih > current_date - g group by tarih) d) end)
    into r from rapor_satirlari where tur = 'satis' and not coalesce(gecersiz, false) and tarih > current_date - g;
  elsif p_arac = 'en_cok_satanlar' then
    select coalesce(jsonb_agg(x), '[]') into r from (
      select jsonb_build_object('kod', max(s.kod), 'ad', max(s.urun_ad), 'adet', sum(s.miktar), 'ciro_kdv_dahil', round(sum(s.toplam)),
        'kar_kdv_haric', round(sum(s.net - s.miktar * coalesce(s.alis_fiyati, 0))), 'stok', max(u.stok)) x
      from rapor_satirlari s left join urunler u on u.id = s.urun_id
      where s.tur = 'satis' and not coalesce(s.gecersiz, false) and s.tarih > current_date - g and s.urun_id is not null
      group by s.urun_id order by case when p->>'siralama' = 'tutar' then sum(s.toplam) else sum(s.miktar) end desc limit lim) t;
  elsif p_arac = 'urun_bul' then
    select coalesce(jsonb_agg(jsonb_build_object('kod', u.kod, 'ad', u.ad, 'marka', u.marka, 'kategori', u.kategori, 'raf', u.raf, 'stok', u.stok,
      'kritik_stok', u.kritik_stok, 'alis_kdv_haric', u.alis_fiyati, 'satis_kdv_dahil', u.satis_fiyati,
      'depolar', (select jsonb_object_agg(d.ad, ds.miktar) from urun_depo_stok ds join depolar d on d.id = ds.depo_id where ds.urun_id = u.id and d.aktif))), '[]')
    into r from (select * from urunler u where u.aktif and length(q) >= 2 and (
        upper(regexp_replace(coalesce(u.kod, ''), '[^A-Za-z0-9]', '', 'g')) = n or upper(regexp_replace(coalesce(u.barkod, ''), '[^A-Za-z0-9]', '', 'g')) = n
        or (select bool_and(u.ad ilike '%' || w || '%' or coalesce(u.marka, '') ilike '%' || w || '%' or coalesce(u.kod, '') ilike '%' || w || '%') from unnest(string_to_array(q, ' ')) w where w <> ''))
      order by (upper(regexp_replace(coalesce(u.kod, ''), '[^A-Za-z0-9]', '', 'g')) = n) desc, u.stok desc limit 15) u;
  elsif p_arac = 'tedarikci_fiyatlari' then
    select coalesce(jsonb_agg(jsonb_build_object('urun', u.kod, 'tedarikci', m.tedarikci, 'tedarikci_kodu', m.kod, 'alis_kdv_haric', round(m.fiyat, 2), 'stokta', m.stok_var,
      'okunma', to_char(m.zaman, 'DD.MM.YYYY HH24:MI'), 'kart_alis', u.alis_fiyati) order by m.stok_var desc, m.fiyat), '[]')
    into r from urunler u join tedarikci_maliyet m on m.urun_id = u.id
    where u.aktif and m.fiyat > 0 and m.zaman > now() - interval '30 days' and length(n) >= 3 and upper(regexp_replace(coalesce(u.kod, ''), '[^A-Za-z0-9]', '', 'g')) = n;
  elsif p_arac = 'tahsilat_durumu' then
    select jsonb_build_object(
      'vadesi_gecen', (select coalesce(jsonb_agg(jsonb_build_object('cari', cari, 'tutar', round(tutar), 'gecikme_gun', gun) order by tutar desc), '[]')
        from (select * from vadesi_gecen where not coalesce(gecersiz, false) order by tutar desc limit 20) v),
      'toplam_vadesi_gecen', (select round(coalesce(sum(tutar), 0)) from vadesi_gecen where not coalesce(gecersiz, false)),
      'son_notlar', (select coalesce(jsonb_agg(jsonb_build_object('cari', cari, 'tur', tur, 'not', left(metin, 160), 'soz_tarih', soz_tarih, 'soz_tutar', soz_tutar, 'durum', durum, 'tarih', olusturma::date) order by olusturma desc), '[]')
        from (select * from tahsilat_notlari where olusturma > now() - interval '30 days' order by olusturma desc limit 25) t)) into r;
  elsif p_arac = 'stok_uyarilari' then
    select jsonb_build_object(
      'kritik', (select coalesce(jsonb_agg(jsonb_build_object('kod', kod, 'ad', ad, 'stok', stok, 'kritik', kritik_stok) order by kritik_stok - stok desc), '[]')
        from (select * from urunler where aktif and kritik_stok > 0 and stok <= kritik_stok order by kritik_stok - stok desc limit 30) k),
      'eksi_stok', (select coalesce(jsonb_agg(jsonb_build_object('kod', kod, 'ad', ad, 'stok', stok)), '[]') from (select * from urunler where aktif and stok < 0 order by stok limit 15) e),
      'acik_planlar', (select coalesce(jsonb_agg(jsonb_build_object('kod', u.kod, 'aksiyon', a.aksiyon, 'not', a.notlar, 'tarih', a.olusturma::date)), '[]')
        from (select * from stok_aksiyon where durum = 'planlandi' order by olusturma desc limit 30) a join urunler u on u.id = a.urun_id)) into r;
  elsif p_arac = 'olu_stok' then
    select coalesce(jsonb_agg(x), '[]') into r from (
      select jsonb_build_object('kod', u.kod, 'ad', u.ad, 'stok', u.stok, 'deger_kdv_haric', round(u.stok * u.alis_fiyati), 'son_satis', s.son) x
      from urunler u left join (select urun_id, max(tarih) son from rapor_satirlari where tur = 'satis' and not coalesce(gecersiz, false) group by 1) s on s.urun_id = u.id
      where u.aktif and u.stok > 0 and u.alis_fiyati > 0 and (s.son is null or s.son < current_date - 180)
      order by u.stok * u.alis_fiyati desc limit lim) t;
  else
    raise exception 'bilinmeyen arac: %', p_arac;
  end if;
  return coalesce(r, '{}'::jsonb);
end $$;
revoke all on function public.asistan_veri(text, jsonb) from public, anon, authenticated;
grant execute on function public.asistan_veri(text, jsonb) to service_role;
