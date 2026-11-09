-- 064 eksi stok mesajında miktar gösterimi · otomatik test. Tek DO bloğu; sonuçları HATA MESAJI olarak döndürür, böylece
-- yaptığı her şey (belgeler, hareketler, numaralar, işlem geçmişi) kesinlikle GERİ ALINIR. Mevcut veriye iz bırakmaz.
-- Sonuç satırı: "064_SONUC gecen=N kalan=M | ..." — kalan 0 olmalı.
do $$
declare
  y text := (select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1);
  d1 uuid := (select id from depolar where aktif order by ad limit 1);
  u uuid[]; b2 uuid; n int; h int; gecen int := 0; kalan int := 0; rapor text := ''; m text;
  v_yil int := extract(year from now() at time zone 'Europe/Istanbul')::int;
  bicim text[][] := array[['1.000','1'], ['5.000','5'], ['0.500','0,5'], ['1.250','1,25'], ['0.000','0'], ['12.345','12,345'], ['1000.000','1000'], ['-2.000','-2']];
begin
  -- 1-8) biçim: numeric(14,3) değerler (veritabanındaki saklama biçimi) beklenen metne dönüşür
  for i in 1 .. array_length(bicim, 1) loop
    m := _miktar_yaz(bicim[i][1]::numeric(14,3));
    if m = bicim[i][2] then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [biçim ' || bicim[i][1] || ' → ' || m || ' KALDI]'; end if;
  end loop;

  -- deneme ürünleri: hiç AKCAN hareketi ve taslağı olmayan, stoklu 2 ürün
  select array_agg(id) into u from (
    select x.id from urunler x where x.aktif and not hizmet_adayi_mi(x.ad, x.kategori)
      and not exists (select 1 from stok_defteri h where h.urun_id = x.id)
      and not exists (select 1 from belge_satirlari s where s.urun_id = x.id)
      and not exists (select 1 from urun_turu t where t.urun_id = x.id)
    order by x.id limit 2) z;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', y)::text, true);

  -- 9) tam sayı: 1 adet varken 5 adet çıkış → "stoku 1, istenen 5"
  perform belge_onayla((belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'GIR', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[1], 'miktar', 1, 'birim_maliyet', 10))))->>'id')::uuid, 1);
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'CIK', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[1], 'miktar', 5))))->>'id')::uuid;
  n := coalesce((select son_no from belge_sayac x where x.tur = 'CIK' and x.yil = v_yil), 0); h := (select count(*) from stok_defteri);
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [9 ONAYLANDI]';
  exception when others then
    if sqlerrm like 'Eksi stok:%deposunda AKCAN stoku 1, istenen 5' then gecen := gecen + 1; rapor := rapor || ' [9 ok: …' || right(sqlerrm, 30) || ']';
    else kalan := kalan + 1; rapor := rapor || ' [9 KALDI: ' || sqlerrm || ']'; end if;
  end;

  -- 10) kesirli: 0,5 varken 1,25 çıkış → "stoku 0,5, istenen 1,25"
  perform belge_onayla((belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'GIR', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[2], 'miktar', 0.5, 'birim_maliyet', 10))))->>'id')::uuid, 1);
  b2 := (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', 'CIK', 'depo_id', d1, 'satirlar',
          jsonb_build_array(jsonb_build_object('urun_id', u[2], 'miktar', 1.25))))->>'id')::uuid;
  n := coalesce((select son_no from belge_sayac x where x.tur = 'CIK' and x.yil = v_yil), 0); h := (select count(*) from stok_defteri);
  begin perform belge_onayla(b2, 1); kalan := kalan + 1; rapor := rapor || ' [10 ONAYLANDI]';
  exception when others then
    if sqlerrm like 'Eksi stok:%deposunda AKCAN stoku 0,5, istenen 1,25' then gecen := gecen + 1; rapor := rapor || ' [10 ok: …' || right(sqlerrm, 34) || ']';
    else kalan := kalan + 1; rapor := rapor || ' [10 KALDI: ' || sqlerrm || ']'; end if;
  end;

  -- 11) red sonrası: taslak kalır, hareket yok, numara harcanmaz, bakiye aynı
  if (select durum from belgeler where id = b2) = 'taslak' and (select surum from belgeler where id = b2) = 1
     and not exists (select 1 from stok_defteri where belge_id = b2) and (select count(*) from stok_defteri) = h
     and coalesce((select son_no from belge_sayac x where x.tur = 'CIK' and x.yil = v_yil), 0) = n
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [11 red sonrası durum KALDI]'; end if;

  -- 12) saklanan değerler ve hassasiyet aynı: bakiye 0.500 (numeric 3 basamak), defter miktarı 0.500
  if (select miktar::text from stok_bakiye where urun_id = u[2] and depo_id = d1) = '0.500'
     and (select miktar::text from stok_defteri where urun_id = u[2] order by id desc limit 1) = '0.500'
     and (select miktar::text from stok_bakiye where urun_id = u[1] and depo_id = d1) = '1.000'
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [12 saklama KALDI]'; end if;

  -- 13) tutarlılık: bakiye = defter, değer = defter tutarları
  if not exists (select 1 from stok_bakiye b full join (select urun_id, depo_id, sum(miktar) s from stok_defteri group by 1, 2) d using (urun_id, depo_id) where coalesce(b.miktar, 0) <> coalesce(d.s, 0))
     and not exists (select 1 from urun_maliyet m left join (select urun_id, sum(tutar) s from stok_defteri group by 1) q using (urun_id) where m.toplam_deger <> coalesce(q.s, 0))
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [13 tutarlılık KALDI]'; end if;

  raise exception '064_SONUC gecen=% kalan=% |%', gecen, kalan, rapor;
end $$;
