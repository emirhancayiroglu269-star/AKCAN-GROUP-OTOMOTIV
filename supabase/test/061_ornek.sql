-- 061 · test ortamına ÖRNEK belgeler (kabul testinde ve raporda görülsün diye kalıcı). Yalnız akcan-test.
\set ON_ERROR_STOP 1
\o /dev/null
select eposta as y from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1 \gset
select eposta as k from kullanicilar where rol = 'kasiyer' and aktif order by eposta limit 1 \gset
select id as d1 from depolar where aktif order by ad limit 1 \gset
select id as d2 from depolar where aktif order by ad offset 1 limit 1 \gset
select id as pa from urunler where aktif and ad ilike '%5W30%' order by ad limit 1 \gset
select id as pb from urunler where aktif and ad ilike '%BALATA%' and id <> :'pa' order by ad limit 1 \gset
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', :'y')::text, true);
create function pg_temp.b(t text, d text, s jsonb, h text default null, a text default 'ÖRNEK (test ortamı)') returns uuid language sql as
$$ select (belge_kaydet(jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', t, 'depo_id', d, 'hedef_depo_id', h, 'aciklama', a, 'satirlar', s))->>'id')::uuid $$;
create function pg_temp.o(i uuid) returns text language sql as $$ select belge_onayla(i, (select surum from belgeler where id = i))->>'no' $$;
select pg_temp.o(pg_temp.b('GIR', :'d1', jsonb_build_array(jsonb_build_object('urun_id', :'pa', 'miktar', 10, 'birim_maliyet', 100), jsonb_build_object('urun_id', :'pb', 'miktar', 4, 'birim_maliyet', 250)), null, 'ÖRNEK: tedarikçiden giriş'));
select pg_temp.o(pg_temp.b('GIR', :'d1', jsonb_build_array(jsonb_build_object('urun_id', :'pa', 'miktar', 5, 'birim_maliyet', 130)), null, 'ÖRNEK: ikinci giriş, daha pahalı'));
select pg_temp.o(pg_temp.b('CIK', :'d1', jsonb_build_array(jsonb_build_object('urun_id', :'pa', 'miktar', 3)), null, 'ÖRNEK: serviste kullanıldı'));
select pg_temp.o(pg_temp.b('TRF', :'d1', jsonb_build_array(jsonb_build_object('urun_id', :'pa', 'miktar', 4)), :'d2', 'ÖRNEK: Velibaba deposuna transfer'));
select pg_temp.o(pg_temp.b('SAY', :'d2', jsonb_build_array(jsonb_build_object('urun_id', :'pa', 'sayilan', 3)), null, 'ÖRNEK: raf sayımı'));
select belge_iptal(i, 'ÖRNEK: yanlış ürün seçilmişti') from (select pg_temp.b('CIK', :'d1', jsonb_build_array(jsonb_build_object('urun_id', :'pb', 'miktar', 1)), null, 'ÖRNEK: iptal edilecek çıkış') i) x
  where pg_temp.o(i) is not null;
select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', :'k')::text, true);
select pg_temp.b('CIK', :'d1', jsonb_build_array(jsonb_build_object('urun_id', :'pa', 'miktar', 1)), null, 'ÖRNEK: kasiyerin onay bekleyen taslağı');
commit;
\o
