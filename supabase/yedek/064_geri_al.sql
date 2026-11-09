-- 064 geri alma: _hareket 061'deki haline döner (mesajda miktar "1.000" biçimine döner) ve _miktar_yaz kaldırılır. Veri değiştirmez.
create or replace function public._hareket(p_belge public.belgeler, p_islem text, p_satir bigint, p_urun uuid, p_depo uuid, p_miktar numeric,
                                            p_birim numeric, p_maliyet_etkisi text, p_ters bigint, p_eposta text, p_uid uuid, p_tutar numeric default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare b numeric; q numeric; a numeric; v numeric; a2 numeric; q2 numeric; c numeric; cb numeric; t numeric; id bigint; ad text; dad text;
begin
  select miktar into b from stok_bakiye where urun_id = p_urun and depo_id = p_depo;
  select toplam_miktar, ort_maliyet, toplam_deger into q, a, v from urun_maliyet where urun_id = p_urun;
  if b + p_miktar < 0 then
    select u.ad into ad from urunler u where u.id = p_urun; select d.ad into dad from depolar d where d.id = p_depo;
    raise exception 'Eksi stok: % · % deposunda AKCAN stoku %, istenen %', ad, dad, b, -p_miktar using errcode = '23514';
  end if;
  q2 := q + p_miktar;
  c := coalesce(p_birim, a);
  t := coalesce(p_tutar, round(p_miktar * c, 2));
  cb := c;
  if q2 = 0 and p_miktar < 0 then t := -v; cb := round(abs(t / p_miktar), 4); end if;   -- stok sıfırlanıyor: kalan değerin tamamı çıkar
  if p_maliyet_etkisi in ('giris', 'cikis_geri') then
    a2 := case when q2 > 0 then greatest(0, round((v + t) / q2, 4)) else a end;   -- (Q·A ± q·c) / (Q ± q), değer üzerinden
  else a2 := a; end if;
  if p_maliyet_etkisi = 'giris' and q <= 0 and p_birim is not null then a2 := round(p_birim, 4); end if;   -- stok yokken giriş: doğrudan c
  insert into stok_defteri (tarih, belge_id, belge_no, tur, islem, satir_id, urun_id, depo_id, miktar, birim_maliyet, tutar,
                            onceki_miktar, sonraki_miktar, toplam_onceki, toplam_sonraki, ort_onceki, ort_sonraki, ters_kayit_id, kullanici, kullanici_id)
  values (p_belge.tarih, p_belge.id, p_belge.no, p_belge.tur, p_islem, p_satir, p_urun, p_depo, p_miktar, cb, t,
          b, b + p_miktar, q, q2, a, a2, p_ters, p_eposta, p_uid)
  returning stok_defteri.id into id;
  update stok_bakiye set miktar = b + p_miktar, son_hareket = id, guncelleme = now() where urun_id = p_urun and depo_id = p_depo;
  update urun_maliyet set toplam_miktar = q2, toplam_deger = v + t, ort_maliyet = a2, son_hareket = id, guncelleme = now() where urun_id = p_urun;
  return id;
end $$;

revoke all on function public._hareket(public.belgeler, text, bigint, uuid, uuid, numeric, numeric, text, bigint, text, uuid, numeric) from public, anon, authenticated, service_role;
drop function if exists public._miktar_yaz(numeric);
