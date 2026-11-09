-- 063 açılış çift sayım engeli · otomatik test. Tek DO bloğu; sonuçları HATA MESAJI olarak döndürür, böylece
-- yaptığı her şey (belgeler, hareketler, numaralar, işlem geçmişi) kesinlikle GERİ ALINIR. Mevcut veriye iz bırakmaz.
-- Sonuç satırı: "063_SONUC gecen=N kalan=M | ..." — kalan 0 olmalı.
do $$
declare
  y text := (select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1);
  d1 uuid := (select id from depolar where aktif order by ad limit 1);
  d2 uuid := (select id from depolar where aktif order by ad offset 1 limit 1);
  u uuid[]; r jsonb; b1 uuid; b2 uuid; n int; sayac0 int; gecen int := 0; kalan int := 0; rapor text := '';
begin
  -- deneme ürünleri: hiç AKCAN hareketi ve bekleyen taslağı olmayan, stoklu 6 ürün
  select array_agg(id) into u from (
    select x.id from urunler x where x.aktif and not hizmet_adayi_mi(x.ad, x.kategori)
      and not exists (select 1 from stok_defteri h where h.urun_id = x.id)
      and not exists (select 1 from belge_satirlari s where s.urun_id = x.id)
      and not exists (select 1 from urun_turu t where t.urun_id = x.id)
    order by x.id limit 6) z;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', y)::text, true);
  sayac0 := coalesce((select son_no from belge_sayac where tur = 'ACL' and yil = extract(year from now() at time zone 'Europe/Istanbul')::int), 0);

  -- 1) normal açılış: hareketi olmayan ürün × depo → onaylanır
  b1 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[1], 'miktar', 4, 'birim_maliyet', 25))))->>'id')::uuid;
  r := belge_onayla(b1, 1);
  if r ? 'no' and (select miktar from stok_bakiye where urun_id = u[1] and depo_id = d1) = 4 then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [1 normal açılış KALDI]'; end if;

  -- 2) aynı ürün × depoya ikinci açılış → reddedilir; taslak kalır, hareket yok, numara harcanmaz
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[1], 'miktar', 4, 'birim_maliyet', 25))))->>'id')::uuid;
  n := (select son_no from belge_sayac where tur = 'ACL' and yil = extract(year from now() at time zone 'Europe/Istanbul')::int);
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [2 ikinci açılış ONAYLANDI]';
  exception when others then
    if sqlerrm like 'Açılış reddedildi%' and (select durum from belgeler where id = b2) = 'taslak' and not exists (select 1 from stok_defteri where belge_id = b2)
       and (select son_no from belge_sayac where tur = 'ACL' and yil = extract(year from now() at time zone 'Europe/Istanbul')::int) = n
       and (select miktar from stok_bakiye where urun_id = u[1] and depo_id = d1) = 4
    then gecen := gecen + 1; rapor := rapor || ' [2 ok: ' || left(sqlerrm, 90) || ']'; else kalan := kalan + 1; rapor := rapor || ' [2 KALDI: ' || sqlerrm || ']'; end if;
  end;

  -- 3) giriş fişinden sonra açılış → reddedilir
  perform belge_onayla((belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'GIR', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[2], 'miktar', 3, 'birim_maliyet', 10))))->>'id')::uuid, 1);
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[2], 'miktar', 3, 'birim_maliyet', 10))))->>'id')::uuid;
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [3 girişten sonra açılış ONAYLANDI]';
  exception when others then if sqlerrm like 'Açılış reddedildi%' and (select miktar from stok_bakiye where urun_id = u[2] and depo_id = d1) = 3
    then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [3 KALDI: ' || sqlerrm || ']'; end if; end;

  -- 4) iki satırlı açılış, biri çakışıyor → tamamı reddedilir, temiz satır da yazılmaz
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[3], 'miktar', 2, 'birim_maliyet', 7), jsonb_build_object('urun_id', u[2], 'miktar', 1, 'birim_maliyet', 10))))->>'id')::uuid;
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [4 ONAYLANDI]';
  exception when others then if sqlerrm like 'Açılış reddedildi: 1 satır%' and not exists (select 1 from stok_defteri where urun_id = u[3])
    then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [4 KALDI: ' || sqlerrm || ']'; end if; end;

  -- 5) aynı ürün başka depoda (orada hareketi yok) → açılış onaylanır
  r := belge_onayla((belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d2, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[1], 'miktar', 2, 'birim_maliyet', 25))))->>'id')::uuid, 1);
  if r ? 'no' and (select miktar from stok_bakiye where urun_id = u[1] and depo_id = d2) = 2 then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [5 KALDI]'; end if;

  -- 6) transferle gelen ürüne hedef depoda açılış → reddedilir
  perform belge_onayla((belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'GIR', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[4], 'miktar', 5, 'birim_maliyet', 9))))->>'id')::uuid, 1);
  perform belge_onayla((belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'TRF', 'depo_id', d1, 'hedef_depo_id', d2, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[4], 'miktar', 2))))->>'id')::uuid, 1);
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d2, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[4], 'miktar', 6, 'birim_maliyet', 9))))->>'id')::uuid;
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [6 transferden sonra açılış ONAYLANDI]';
  exception when others then if sqlerrm like 'Açılış reddedildi%' and (select miktar from stok_bakiye where urun_id = u[4] and depo_id = d2) = 2
    then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [6 KALDI: ' || sqlerrm || ']'; end if; end;

  -- 7) hareketi iptal edilmiş (net 0) ürün × depo → geçmiş hareket var, açılış yine reddedilir
  b1 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'GIR', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[5], 'miktar', 1, 'birim_maliyet', 5))))->>'id')::uuid;
  perform belge_onayla(b1, 1); perform belge_iptal(b1, 'deneme iptali');
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'ACL', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[5], 'miktar', 1, 'birim_maliyet', 5))))->>'id')::uuid;
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [7 iptal sonrası açılış ONAYLANDI]';
  exception when others then if sqlerrm like 'Açılış reddedildi%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [7 KALDI: ' || sqlerrm || ']'; end if; end;

  -- 8) numaralar: başarılı iki açılış = sayaç +2, boşluk yok
  if (select son_no from belge_sayac where tur = 'ACL' and yil = extract(year from now() at time zone 'Europe/Istanbul')::int) = sayac0 + 2
     and not exists (select 1 from (select tur, yil, count(*) c, max(sira_no) m from belgeler where no is not null group by 1, 2) q where c <> m)
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [8 numara KALDI]'; end if;

  -- 9) tutarlılık: bakiye = defter, değer = defter tutarları
  if not exists (select 1 from stok_bakiye b full join (select urun_id, depo_id, sum(miktar) s from stok_defteri group by 1, 2) d using (urun_id, depo_id) where coalesce(b.miktar, 0) <> coalesce(d.s, 0))
     and not exists (select 1 from urun_maliyet m left join (select urun_id, sum(tutar) s from stok_defteri group by 1) q using (urun_id) where m.toplam_deger <> coalesce(q.s, 0))
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [9 tutarlılık KALDI]'; end if;

  raise exception '063_SONUC gecen=% kalan=% |%', gecen, kalan, rapor;
end $$;
