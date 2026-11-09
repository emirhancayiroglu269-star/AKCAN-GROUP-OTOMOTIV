-- YALNIZ YEREL TEST VERİTABANI. akcan-test'te ÇALIŞTIRILMAZ (rapor_satirlari'na geçici satır yazar; F2.1 akcan-test'te bu tabloya dokunmaz).
-- BizimHesap kaynağı (bh) yolunu dener: faturaya ve depoya göre gruplama, depo adından eşleşme, yeniden yüklemede eski satırların
-- ilk görülme anını koruması, iade satırlarının alınmaması. Tek DO bloğu; her şey geri alınır.
do $$
declare
  y text := (select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1);
  sb uuid := (select id from depolar where ad ilike 'SULTANBEYL%' and aktif order by ad limit 1);
  ref timestamptz := '2026-11-07 17:20:05+03';
  u1 uuid; u2 uuid; r jsonb; gecen int := 0; kalan int := 0; rapor text := '';
begin
  select id into u1 from urunler where aktif order by kod limit 1;
  select id into u2 from urunler where aktif order by kod offset 1 limit 1;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', y)::text, true);
  perform public.kopru_kesim_onayla(sb, 'alis', ref, 'yerel bh testi');
  -- F1: kesimden sonra, iki satır; ayrıca aynı faturanın kesimden ÖNCE yüklenmiş eski (geçersiz) hali → ilk görülme eskidir
  insert into rapor_satirlari (tarih, tur, urun_id, urun_ad, miktar, birim_fiyat, indirim, kdv_orani, belge_guid, cari_guid, cari_ad, depo, saat, yuklendi, gecersiz, iade) values
    ('2026-11-08', 'alis', u1, 'A', 2, 10, 0, 20, 'BH-F1', 'C1', 'Gerçek Tedarikçi', 'sultanbeyli', '10:00', ref - interval '1 day', true, false),
    ('2026-11-08', 'alis', u1, 'A', 2, 10, 0, 20, 'BH-F1', 'C1', 'Gerçek Tedarikçi', 'sultanbeyli', '10:00', ref + interval '1 day', false, false),
    ('2026-11-08', 'alis', u2, 'B', 1, 50, 5, 20, 'BH-F1', 'C1', 'Gerçek Tedarikçi', 'sultanbeyli', '10:00', ref + interval '1 day', false, false),
    -- F2: kesimden sonra, tanınmayan depo → hata
    ('2026-11-08', 'alis', u1, 'A', 1, 10, 0, 20, 'BH-F2', 'C1', 'Gerçek Tedarikçi', 'BİLİNMEYEN', '11:00', ref + interval '1 day', false, false),
    -- F3: iade satırı → alış köprüsüne girmez
    ('2026-11-08', 'alis', u1, 'A', 1, 10, 0, 20, 'BH-F3', 'C1', 'Gerçek Tedarikçi', 'sultanbeyli', '12:00', ref + interval '1 day', false, true),
    -- F4: satış satırı → alış köprüsüne girmez
    ('2026-11-08', 'satis', u1, 'A', 1, 10, 0, 20, 'BH-F4', 'C9', 'Müşteri', 'sultanbeyli', '12:00', ref + interval '1 day', false, false);
  r := public.alis_kopru_calistir('bh');
  -- F1 ilk görülme kesimden önce (eski geçersiz satır) ama tarihi kesimden sonra → işlenir; 2 satır; tedarikçi kaynak bh
  if (r->>'okunan')::int = 2 and r->'yeni' = '{"hata": 1, "islendi": 1}'::jsonb
     and (select count(*) from alis_taslak_satir s join alis_taslak a on a.id = s.taslak_id where a.bh_belge_guid = 'BH-F1') = 2
     and (select ilk_gorulme from kopru_kayit where bh_belge_guid = 'BH-F1') = ref - interval '1 day'
     and (select kaynak || ':' || bh_cari_id from tedarikciler where unvan = 'Gerçek Tedarikçi') = 'bh:C1'
     and (select karar_nedeni from kopru_kayit where bh_belge_guid = 'BH-F2') like 'Depo tanınmadı%'
     and not exists (select 1 from kopru_kayit where bh_belge_guid in ('BH-F3', 'BH-F4'))
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [BH1 KALDI ' || r::text || ']'; end if;
  -- bh kaynağıyla deneme kimliği karışamaz: DENEME- önekli gerçek fatura kaydı reddedilir
  insert into rapor_satirlari (tarih, tur, urun_id, miktar, birim_fiyat, belge_guid, depo, saat, gecersiz, iade) values ('2026-11-08', 'alis', u1, 1, 1, 'DENEME-SAHTE', 'sultanbeyli', '13:00', false, false);
  begin r := public.alis_kopru_calistir('bh'); kalan := kalan + 1; rapor := rapor || ' [BH2 DENEME- önekli gerçek fatura KABUL]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [BH2 ' || sqlerrm || ']'; end;
  raise exception 'BH_SONUC gecen=% kalan=% |%', gecen, kalan, rapor;
end $$;
