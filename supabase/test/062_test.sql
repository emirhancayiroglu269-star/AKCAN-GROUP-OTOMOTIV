-- 062 ürün türü (stoklu / hizmet) ve açılış taslağı · otomatik testler. TEK İŞLEM, sonunda GERİ ALINIR.
\set ON_ERROR_STOP 1
begin;
create temp table sonuc (sira int, test text, ok boolean, detay text);
create temp table ctx (k text primary key, v text);
grant all on sonuc, ctx to authenticated, anon;
create function pg_temp.k(p_test text, p_ok boolean, p_detay text default null) returns void language sql as
$$ insert into sonuc values ((select count(*) + 1 from sonuc), p_test, coalesce(p_ok, false), p_detay) $$;
create function pg_temp.olarak(p_eposta text) returns void language plpgsql as $$
begin
  if p_eposta is null then execute 'reset role'; perform set_config('request.jwt.claims', '', true); return; end if;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', p_eposta, 'sub', gen_random_uuid())::text, true);
end $$;
create function pg_temp.hata(p_sql text) returns text language plpgsql as $$ begin execute p_sql; return null; exception when others then return sqlerrm; end $$;
create function pg_temp.j(p_sql text) returns jsonb language plpgsql as $$
declare r jsonb; begin execute p_sql into r; return r; exception when others then return jsonb_build_object('hata', sqlerrm); end $$;
create function pg_temp.c(p_k text) returns text language sql as $$ select v from ctx where k = p_k $$;
create function pg_temp.set(p_k text, p_v text) returns void language sql as $$ insert into ctx values (p_k, p_v) on conflict (k) do update set v = excluded.v $$;
create function pg_temp.kaydet(p_tur text, p_depo text, p_satirlar jsonb, p_hedef text default null) returns jsonb language sql as
$$ select pg_temp.j(format('select belge_kaydet(%L::jsonb)', jsonb_build_object('istek_anahtari', gen_random_uuid(), 'tur', p_tur, 'depo_id', p_depo, 'hedef_depo_id', p_hedef, 'satirlar', p_satirlar))) $$;
create function pg_temp.onayla(p_id text) returns jsonb language sql as
$$ select pg_temp.j(format('select belge_onayla(%L, (select surum from belgeler where id = %L))', p_id, p_id)) $$;
create function pg_temp.tur(p_ids text[], p_tur text) returns jsonb language sql as
$$ select pg_temp.j(format('select urun_turu_belirle(%L::uuid[], %L)', p_ids, p_tur)) $$;
create function pg_temp.satir(p_urun text, p_miktar numeric, p_maliyet numeric default null) returns jsonb language sql as
$$ select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('urun_id', p_urun, 'miktar', p_miktar, 'birim_maliyet', p_maliyet))) $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

\o /dev/null
select pg_temp.set('Y', (select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1));
select pg_temp.set('K', (select eposta from kullanicilar where rol = 'kasiyer' and aktif order by eposta limit 1));
select pg_temp.set('D1', (select id::text from depolar where aktif order by ad limit 1));
select pg_temp.set('D2', (select id::text from depolar where aktif order by ad offset 1 limit 1));
-- iki hizmet adayı, iki normal ürün
select pg_temp.set('H' || n, id::text) from (select id, row_number() over (order by ad) n from urunler where aktif and hizmet_adayi_mi(ad, kategori) order by ad limit 2) x;
select pg_temp.set('S' || n, id::text) from (select id, row_number() over (order by id) n from urunler where aktif and not hizmet_adayi_mi(ad, kategori) order by id limit 2) x;
select pg_temp.set('ADAY', (select count(*)::text from urunler where aktif and hizmet_adayi_mi(ad, kategori)));
\o

select pg_temp.olarak(pg_temp.c('Y'));
do $$
declare r jsonb; v_id text; Y text := pg_temp.c('Y'); D1 text := pg_temp.c('D1'); D2 text := pg_temp.c('D2');
        H1 text := pg_temp.c('H1'); H2 text := pg_temp.c('H2'); S1 text := pg_temp.c('S1'); S2 text := pg_temp.c('S2');
begin
  perform pg_temp.k('Hizmet adayları kendiliğinden sınıflandırılmaz (tür kaydı yok)', (select count(*) from urun_turu) = 0
     and (select count(*) from urun_turu_kontrol where aday and tur is null) = pg_temp.c('ADAY')::int, pg_temp.c('ADAY') || ' aday');
  r := pg_temp.kaydet('CIK', D1, pg_temp.satir(H1, 1));
  perform pg_temp.k('Türü belirlenmemiş hizmet adayı stok belgesine eklenemez', r ? 'hata' and r->>'hata' like '%türü henüz belirlenmemiş%', r->>'hata');

  r := pg_temp.tur(array[H1], 'hizmet');
  perform pg_temp.k('Yönetici ürünü HİZMET olarak belirler; kim ve ne zaman kaydedilir', (r->>'ok')::boolean
     and (select tur = 'hizmet' and belirleyen = Y from urun_turu where urun_id = H1::uuid), r::text);
  perform pg_temp.k('Hizmet ürünü giriş fişine eklenemez', (pg_temp.kaydet('GIR', D1, pg_temp.satir(H1, 1, 10)))->>'hata' like '%hizmet ürünü%');
  perform pg_temp.k('Hizmet ürünü çıkış fişine eklenemez', (pg_temp.kaydet('CIK', D1, pg_temp.satir(H1, 1)))->>'hata' like '%hizmet ürünü%');
  perform pg_temp.k('Hizmet ürünü transfere eklenemez', (pg_temp.kaydet('TRF', D1, pg_temp.satir(H1, 1), D2))->>'hata' like '%hizmet ürünü%');
  perform pg_temp.k('Hizmet ürünü sayıma eklenemez', (pg_temp.kaydet('SAY', D1, jsonb_build_array(jsonb_build_object('urun_id', H1, 'sayilan', 1))))->>'hata' like '%hizmet ürünü%');
  perform pg_temp.k('Hizmet ürünü açılışa eklenemez', (pg_temp.kaydet('ACL', D1, pg_temp.satir(H1, 1, 10)))->>'hata' like '%hizmet ürünü%');

  -- aday STOKLU olarak belirlenirse belgeye girebilir
  r := pg_temp.tur(array[H2], 'stoklu');
  r := pg_temp.kaydet('GIR', D1, pg_temp.satir(H2, 2, 40)); r := pg_temp.onayla(r->>'id');
  perform pg_temp.k('Yönetici STOKLU dediği aday ürün belgeye girer', r ? 'no', r::text);
  -- stoğu olan ürün hizmete çevrilemez
  r := pg_temp.tur(array[H2], 'hizmet');
  perform pg_temp.k('AKCAN stoku olan ürün hizmete çevrilemez', r ? 'hata' and (select tur from urun_turu where urun_id = H2::uuid) = 'stoklu', r->>'hata');

  -- taslaktayken türü hizmete çevrilen ürün: onay reddedilir, hiçbir hareket yazılmaz
  r := pg_temp.kaydet('GIR', D1, pg_temp.satir(S1, 3, 20)); v_id := r->>'id';
  perform pg_temp.tur(array[S1], 'hizmet');
  r := pg_temp.onayla(v_id);
  perform pg_temp.k('Taslak sonrası hizmete çevrilen ürün: onay reddedilir, stok yazılmaz', r ? 'hata'
     and not exists (select 1 from stok_defteri where belge_id = v_id::uuid) and (select durum from belgeler where id = v_id::uuid) = 'taslak', r->>'hata');
  perform pg_temp.tur(array[S1], 'stoklu');
  r := pg_temp.onayla(v_id);
  perform pg_temp.k('Türü yeniden stoklu yapılınca aynı taslak onaylanır', r ? 'no', r::text);

  perform pg_temp.k('Hizmet ürününün kartı ve satış geçmişi korunur (ürün silinmez, pasifleşmez)', exists (select 1 from urunler where id = H1::uuid and aktif));
end $$;

-- ürün türü tablosuna doğrudan yazılamaz; kasiyer tür belirleyemez
select pg_temp.olarak(null);
do $$ begin
  perform pg_temp.k('Ürün türü doğrudan değiştirilemez (yalnız uygulamadan)', pg_temp.hata(format('update urun_turu set tur = %L', 'stoklu')) is not null);
  perform pg_temp.k('Ürün türü değişiklikleri işlem geçmişine düşer', (select count(*) from denetim where tablo = 'urun_turu') >= 3);
end $$;
select pg_temp.olarak(pg_temp.c('K'));
do $$ begin
  perform pg_temp.k('Kasiyer ürün türü belirleyemez', (pg_temp.tur(array[pg_temp.c('H2')], 'hizmet')) ? 'hata');
  perform pg_temp.k('Kasiyer kontrol listesini görür (yalnız ürün adı ve tür)', (select count(*) from urun_turu_kontrol) > 0);
  perform pg_temp.k('Kasiyer açılış hazırlayamaz', (pg_temp.j(format('select acilis_taslagi_olustur(%L)', pg_temp.c('D1')))) ? 'hata');
end $$;

-- ========== açılış taslağı (BizimHesap stokundan) ==========
select pg_temp.olarak(pg_temp.c('Y'));
do $$
declare r jsonb; D1 text := pg_temp.c('D1'); beklenen int; istisna int; ilk text; n int; fark int; kdv_haric boolean := coalesce((select alis_kdv_haric from ayarlar where id = 1), true);
begin
  -- beklenen satır sayısı bağımsız hesap: BH'da stoku > 0, stoklu (hizmet ya da belirsiz değil), maliyeti > 0 ve satıştan yüksek değil, AKCAN'da hareketi olmayan
  select count(*) into beklenen from urun_depo_stok s join urunler u on u.id = s.urun_id
   where s.depo_id = D1::uuid and s.miktar > 0 and u.aktif and coalesce(u.alis_fiyati, 0) > 0
     and not exists (select 1 from urun_turu t where t.urun_id = u.id and t.tur = 'hizmet')
     and (exists (select 1 from urun_turu t where t.urun_id = u.id and t.tur = 'stoklu') or not hizmet_adayi_mi(u.ad, u.kategori))
     and not ((case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end) > coalesce(u.satis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100) and coalesce(u.satis_fiyati, 0) > 0)
     and not exists (select 1 from stok_defteri d where d.urun_id = u.id and d.depo_id = D1::uuid);
  r := pg_temp.j(format('select acilis_taslagi_olustur(%L)', D1));
  perform pg_temp.k('Açılış taslağı: BizimHesap stoku olan uygun her ürün için bir satır', (r->>'satir')::int = beklenen, format('%s satır, %s belge (beklenen %s)', r->>'satir', r->>'belge', beklenen));
  perform pg_temp.k('Açılış taslakları en fazla 300 satırlık belgelere bölünür', not exists (select 1 from belge_satirlari x join belgeler b on b.id = x.belge_id where b.tur = 'ACL' and b.durum = 'taslak' group by b.id having count(*) > 300));
  perform pg_temp.k('Açılışa hizmet, türü belirsiz, maliyeti sıfır ya da eksi stoklu ürün girmez', not exists (
     select 1 from belge_satirlari x join belgeler b on b.id = x.belge_id join urunler u on u.id = x.urun_id
     where b.tur = 'ACL' and b.durum = 'taslak' and (urun_turu_bul(u.id) = 'hizmet' or (hizmet_adayi_mi(u.ad, u.kategori) and not exists (select 1 from urun_turu t where t.urun_id = u.id)) or coalesce(x.birim_maliyet, 0) <= 0 or x.miktar <= 0)));
  perform pg_temp.k('Açılış maliyeti ürün kartındaki alış fiyatıdır (KDV hariç); uydurulmaz', not exists (
     select 1 from belge_satirlari x join belgeler b on b.id = x.belge_id join urunler u on u.id = x.urun_id
     where b.tur = 'ACL' and b.durum = 'taslak' and x.birim_maliyet <> round(case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end, 4)));
  select count(*) into istisna from acilis_istisnalari(D1::uuid);
  select count(*) into n from urun_depo_stok s join urunler u on u.id = s.urun_id
   where s.depo_id = D1::uuid and s.miktar > 0 and u.aktif and coalesce(u.alis_fiyati, 0) > 0
     and not exists (select 1 from urun_turu t where t.urun_id = u.id and t.tur = 'hizmet')
     and (exists (select 1 from urun_turu t where t.urun_id = u.id and t.tur = 'stoklu') or not hizmet_adayi_mi(u.ad, u.kategori))
     and not ((case when kdv_haric then u.alis_fiyati else u.alis_fiyati / (1 + coalesce(u.kdv, 20) / 100) end) > coalesce(u.satis_fiyati, 0) / (1 + coalesce(u.kdv, 20) / 100) and coalesce(u.satis_fiyati, 0) > 0);
  perform pg_temp.k('İstisna listesi: açılışa alınamayan her BizimHesap kalemi nedeniyle listelenir (eksi stok, maliyet, hizmet, belirsiz, pasif)',
     istisna = (select count(*) from urun_depo_stok s where s.depo_id = D1::uuid and s.miktar <> 0) - n, format('%s istisna', istisna));
  perform pg_temp.k('İstisnalarda neden hep dolu', not exists (select 1 from acilis_istisnalari(D1::uuid) where neden is null));
  r := pg_temp.j(format('select acilis_taslagi_olustur(%L)', D1));
  perform pg_temp.k('Açılış ikinci kez hazırlanınca aynı ürünler tekrar alınmaz', (r->>'satir')::int = 0, r::text);

  -- ilk açılış belgesini onayla: AKCAN bakiyesi BizimHesap miktarına, ortalama kart maliyetine eşit olur
  select id::text into ilk from belgeler where tur = 'ACL' and durum = 'taslak' order by olusturma, id limit 1;
  r := pg_temp.onayla(ilk);
  select count(*) into fark from belge_satirlari x join stok_bakiye b on b.urun_id = x.urun_id and b.depo_id = D1::uuid
    join urun_depo_stok s on s.urun_id = x.urun_id and s.depo_id = D1::uuid where x.belge_id = ilk::uuid and b.miktar <> s.miktar;
  perform pg_temp.k('Onaylanan açılış: AKCAN stoku = BizimHesap stoku (karşılaştırmada fark yok)', r ? 'no' and fark = 0, format('%s · fark %s', r, fark));
  select count(*) into n from belge_satirlari x join urun_maliyet m on m.urun_id = x.urun_id where x.belge_id = ilk::uuid and m.ort_maliyet <> x.birim_maliyet
    and not exists (select 1 from stok_defteri d where d.urun_id = x.urun_id and d.belge_id <> ilk::uuid);
  perform pg_temp.k('Açılış ortalama maliyeti satırdaki maliyettir', n = 0, n || ' fark');
end $$;

select pg_temp.olarak(null);
\pset footer off
select sira as "#", case when ok then 'GEÇTİ' else 'KALDI' end as sonuc, test, coalesce(left(detay, 160), '') as detay from sonuc order by sira;
select count(*) filter (where ok) as gecen, count(*) filter (where not ok) as kalan, count(*) as toplam from sonuc;
select count(*) filter (where not ok) as kalan from sonuc \gset
rollback;
select case when :kalan > 0 then (:kalan || ' test başarısız')::int end as basarisiz_test_var;
