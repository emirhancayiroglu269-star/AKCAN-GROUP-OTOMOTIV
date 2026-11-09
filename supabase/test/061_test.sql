-- 061 belge motoru · otomatik kural testleri (tek bağlantı)
-- Tamamı TEK İŞLEM içinde çalışır ve sonunda GERİ ALINIR: veritabanında hiçbir iz bırakmaz.
-- Kullanım: psql -v ON_ERROR_STOP=1 -f 061_test.sql   (sonuçlar tablo olarak basılır; başarısız test varsa son satır hata verir)
\set ON_ERROR_STOP 1
begin;
create temp table sonuc (sira int, test text, ok boolean, detay text);
create temp table ctx (k text primary key, v text);
grant all on sonuc, ctx to authenticated, anon;

-- ---------- yardımcılar ----------
create function pg_temp.k(p_test text, p_ok boolean, p_detay text default null) returns void language sql as
$$ insert into sonuc values ((select count(*) + 1 from sonuc), p_test, coalesce(p_ok, false), p_detay) $$;
create function pg_temp.olarak(p_eposta text) returns void language plpgsql as $$
begin
  if p_eposta is null then execute 'reset role'; perform set_config('request.jwt.claims', '', true); return; end if;
  if p_eposta = 'anon' then execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true); return; end if;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', p_eposta, 'sub', gen_random_uuid())::text, true);
end $$;
/** SQL'i çalıştırır; hata olursa hata metnini döndürür (etkisi geri alınır), olmazsa null */
create function pg_temp.hata(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return null; exception when others then return sqlerrm; end $$;
create function pg_temp.j(p_sql text) returns jsonb language plpgsql as $$
declare r jsonb; begin execute p_sql into r; return r; exception when others then return jsonb_build_object('hata', sqlerrm); end $$;
create function pg_temp.c(p_k text) returns text language sql as $$ select v from ctx where k = p_k $$;
create function pg_temp.set(p_k text, p_v text) returns void language sql as $$ insert into ctx values (p_k, p_v) on conflict (k) do update set v = excluded.v $$;
/** belge_kaydet çağrısı: tür, depo, (hedef), satırlar */
create function pg_temp.kaydet(p_tur text, p_depo text, p_satirlar jsonb, p_hedef text default null, p_tarih date default null, p_anahtar uuid default gen_random_uuid()) returns jsonb language sql as
$$ select pg_temp.j(format('select belge_kaydet(%L::jsonb)', jsonb_build_object('istek_anahtari', p_anahtar, 'tur', p_tur, 'depo_id', p_depo, 'hedef_depo_id', p_hedef, 'tarih', p_tarih, 'satirlar', p_satirlar))) $$;
create function pg_temp.onayla(p_id text) returns jsonb language sql as
$$ select pg_temp.j(format('select belge_onayla(%L, (select surum from belgeler where id = %L))', p_id, p_id)) $$;
create function pg_temp.iptal(p_id text, p_neden text default 'test iptali') returns jsonb language sql as
$$ select pg_temp.j(format('select belge_iptal(%L, %L)', p_id, p_neden)) $$;
create function pg_temp.bakiye(p_urun text, p_depo text) returns numeric language sql as
$$ select coalesce((select miktar from stok_bakiye where urun_id = p_urun::uuid and depo_id = p_depo::uuid), 0) $$;
create function pg_temp.ort(p_urun text) returns numeric language sql as $$ select ort_maliyet from urun_maliyet where urun_id = p_urun::uuid $$;
create function pg_temp.toplam(p_urun text) returns numeric language sql as $$ select toplam_miktar from urun_maliyet where urun_id = p_urun::uuid $$;
/** mevcut stok tablolarının parmak izi (BizimHesap eşitlemesinin tabloları): test bunlara dokunmamalı */
create function pg_temp.iz() returns text language plpgsql as $$
declare a text; b text := '';
begin
  select md5(coalesce(string_agg(id::text || ':' || coalesce(stok::text, ''), ',' order by id), '')) into a from urunler;
  if to_regclass('public.urun_depo_stok') is not null then
    execute 'select md5(coalesce(string_agg(urun_id::text || depo_id::text || miktar::text, '','' order by urun_id, depo_id), '''')) from urun_depo_stok' into b;
  end if;
  return a || b;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

\o /dev/null
-- ---------- bağlam: kullanıcılar, depolar, deneme ürünleri (mevcut veri değişmez; yalnız yeni tablolara yazılır) ----------
select pg_temp.set('Y', (select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1));
select pg_temp.set('K', (select eposta from kullanicilar where rol = 'kasiyer' and aktif order by eposta limit 1));
select pg_temp.set('D1', (select id::text from depolar where aktif order by ad limit 1));
select pg_temp.set('D2', (select id::text from depolar where aktif order by ad offset 1 limit 1));
select pg_temp.set('DP', (select id::text from depolar where not aktif limit 1));
select pg_temp.set('U' || n, id::text) from (select id, row_number() over (order by id) n from urunler where aktif order by id limit 8) x;
select pg_temp.set('UP', (select id::text from urunler where not aktif limit 1));
select pg_temp.set('IZ_ONCE', pg_temp.iz());
select pg_temp.set('YIL', extract(year from (now() at time zone 'Europe/Istanbul'))::text);

-- ========== yönetici senaryoları ==========
select pg_temp.olarak(pg_temp.c('Y'));
do $$
declare r jsonb; r2 jsonb; id1 text; id2 text; id3 text; idx text; a uuid := gen_random_uuid(); n int; e text;
        Y text := pg_temp.c('Y'); D1 text := pg_temp.c('D1'); D2 text := pg_temp.c('D2'); U1 text := pg_temp.c('U1'); U2 text := pg_temp.c('U2');
        U3 text := pg_temp.c('U3'); U4 text := pg_temp.c('U4'); U5 text := pg_temp.c('U5'); v_yil text := pg_temp.c('YIL');
begin
  -- 1) çift kayıt: aynı istek anahtarı
  r := pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 10, 'birim_maliyet', 100)), null, null, a);
  r2 := pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 10, 'birim_maliyet', 100)), null, null, a);
  perform pg_temp.k('Çift kayıt: aynı istek anahtarıyla ikinci kayıt aynı belgeyi döndürür', r->>'id' = r2->>'id' and (r2->>'tekrar')::boolean
     and (select count(*) from belgeler where istek_anahtari = a) = 1, r2::text);
  id1 := r->>'id';
  perform pg_temp.k('Taslak stoku değiştirmez', pg_temp.bakiye(U1, D1) = 0 and not exists (select 1 from stok_defteri where belge_id = id1::uuid));

  -- 2) giriş onayı: 10 × 100
  r := pg_temp.onayla(id1);
  perform pg_temp.k('Giriş onayı: numara biçimi GIR-yıl-000001', r->>'no' ~ ('^GIR-' || v_yil || '-[0-9]{6}$'), r::text);
  perform pg_temp.set('GIR1_NO', r->>'no');
  perform pg_temp.k('Giriş onayı: depo bakiyesi 10, ortalama 100', pg_temp.bakiye(U1, D1) = 10 and pg_temp.ort(U1) = 100 and pg_temp.toplam(U1) = 10,
     format('bakiye %s ort %s', pg_temp.bakiye(U1, D1), pg_temp.ort(U1)));

  -- 3) aynı belgeye ikinci onay
  n := (select count(*) from stok_defteri where belge_id = id1::uuid);
  r := pg_temp.onayla(id1);
  perform pg_temp.k('Aynı belge iki kez onaylanamaz: ikinci onay "zaten" döner, hareket ve stok değişmez',
     (r->>'zaten')::boolean and (select count(*) from stok_defteri where belge_id = id1::uuid) = n and pg_temp.bakiye(U1, D1) = 10, r::text);

  -- 4) ağırlıklı ortalama: + 5 × 130 → (1000 + 650) / 15 = 110
  r := pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 5, 'birim_maliyet', 130)));
  id2 := r->>'id'; r := pg_temp.onayla(id2); perform pg_temp.set('GIR2', id2);
  perform pg_temp.k('Ortalama maliyet: 10×100 + 5×130 → 110,0000', pg_temp.ort(U1) = 110 and pg_temp.toplam(U1) = 15, format('ort %s', pg_temp.ort(U1)));
  perform pg_temp.k('Numaralar sıralı: ikinci giriş 000002', r->>'no' = 'GIR-' || v_yil || '-000002', r->>'no');

  -- 5) çıkış: 3 adet ortalama maliyetle, ortalama değişmez
  r := pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 3)));
  idx := r->>'id'; r := pg_temp.onayla(idx);
  perform pg_temp.k('Çıkış: 3 × 110 = −330 TL, ortalama 110 kalır, bakiye 12',
     pg_temp.ort(U1) = 110 and pg_temp.bakiye(U1, D1) = 12 and (select tutar from stok_defteri where belge_id = idx::uuid) = -330,
     format('ort %s bakiye %s', pg_temp.ort(U1), pg_temp.bakiye(U1, D1)));
  perform pg_temp.k('Her türün kendi serisi: ilk çıkış CIK-yıl-000001', r->>'no' = 'CIK-' || v_yil || '-000001', r->>'no');

  -- 6) eksi stok
  r := pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 13)));
  idx := r->>'id'; r := pg_temp.onayla(idx);
  perform pg_temp.k('Eksi stok engellenir: 12 varken 13 çıkış onaylanmaz', r ? 'hata' and r->>'hata' like 'Eksi stok%'
     and pg_temp.bakiye(U1, D1) = 12 and (select durum from belgeler where id = idx::uuid) = 'taslak', r->>'hata');
  perform pg_temp.k('Reddedilen onay numara harcamaz', (select son_no from belge_sayac where tur = 'CIK' and yil = v_yil::int) = 1);

  -- 7) transfer: D1 → D2 4 adet, atomik
  r := pg_temp.kaydet('TRF', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 4)), D2);
  idx := r->>'id'; r := pg_temp.onayla(idx);
  perform pg_temp.k('Transfer: kaynak 12→8, hedef 0→4, toplam 12 ve ortalama 110 aynı',
     pg_temp.bakiye(U1, D1) = 8 and pg_temp.bakiye(U1, D2) = 4 and pg_temp.toplam(U1) = 12 and pg_temp.ort(U1) = 110
     and (select count(*) from stok_defteri where belge_id = idx::uuid) = 2 and (select sum(miktar) from stok_defteri where belge_id = idx::uuid) = 0, r::text);
  perform pg_temp.set('TRF1', idx);

  -- 8) transfer atomikliği: 2 satır, ikincisi eksiye düşüyor → hiçbiri işlenmez
  perform pg_temp.onayla((pg_temp.kaydet('GIR', D2, jsonb_build_array(jsonb_build_object('urun_id', U2, 'miktar', 2, 'birim_maliyet', 50))))->>'id');
  r := pg_temp.kaydet('TRF', D2, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1), jsonb_build_object('urun_id', U2, 'miktar', 3)), D1);
  idx := r->>'id'; r := pg_temp.onayla(idx);
  perform pg_temp.k('Transfer atomik: bir satır eksiye düşerse diğer satır da işlenmez',
     r ? 'hata' and pg_temp.bakiye(U1, D2) = 4 and pg_temp.bakiye(U1, D1) = 8 and pg_temp.bakiye(U2, D2) = 2 and pg_temp.bakiye(U2, D1) = 0
     and not exists (select 1 from stok_defteri where belge_id = idx::uuid), r->>'hata');
  perform pg_temp.k('Transferde kaynak ve hedef aynı depo olamaz', (pg_temp.kaydet('TRF', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1)), D1)) ? 'hata');

  -- 9) sayım: U1 D1'de sistem 8, sayılan 6 → −2; U3 (hiç maliyeti yok) sayılan 3, birim 40 → +3, ortalama 40
  r := pg_temp.kaydet('SAY', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'sayilan', 6), jsonb_build_object('urun_id', U3, 'sayilan', 3, 'birim_maliyet', 40)));
  idx := r->>'id'; r := pg_temp.onayla(idx);
  perform pg_temp.k('Sayım eksiği: sistem 8, sayılan 6 → −2 ortalama maliyetle (−220 TL)',
     pg_temp.bakiye(U1, D1) = 6 and pg_temp.ort(U1) = 110 and (select sistem from belge_satirlari where belge_id = idx::uuid and urun_id = U1::uuid) = 8
     and (select fark from belge_satirlari where belge_id = idx::uuid and urun_id = U1::uuid) = -2
     and (select tutar from stok_defteri where belge_id = idx::uuid and urun_id = U1::uuid) = -220, r::text);
  perform pg_temp.k('Sayım fazlası: maliyeti olmayan üründe girilen birim maliyet ilk ortalama olur', pg_temp.bakiye(U3, D1) = 3 and pg_temp.ort(U3) = 40);
  r := pg_temp.kaydet('SAY', D1, jsonb_build_array(jsonb_build_object('urun_id', U4, 'sayilan', 2)));
  r := pg_temp.onayla(r->>'id');
  perform pg_temp.k('Sayım fazlası: maliyeti bilinmeyen ürüne maliyet uydurulmaz, onay durur', r ? 'hata' and pg_temp.bakiye(U4, D1) = 0, r->>'hata');
  r := pg_temp.kaydet('SAY', D2, jsonb_build_array(jsonb_build_object('urun_id', U1, 'sayilan', 4)));
  idx := r->>'id'; r := pg_temp.onayla(idx);
  perform pg_temp.k('Sayım farkı yoksa stok hareketi yazılmaz', pg_temp.bakiye(U1, D2) = 4 and not exists (select 1 from stok_defteri where belge_id = idx::uuid)
     and (select fark from belge_satirlari where belge_id = idx::uuid) = 0);

  -- 10) giriş iptali: U1 toplam 10 (D1 6 + D2 4), ort 110; 5 × 130 girişinin iptali → (10×110 − 5×130) / 5 = 90
  r := pg_temp.iptal(pg_temp.c('GIR2'), 'yanlış miktar girildi');
  perform pg_temp.k('İptal: giriş tersine çevrilir (D1 6→1), ortalama geri hesaplanır (90)',
     pg_temp.bakiye(U1, D1) = 1 and pg_temp.toplam(U1) = 5 and pg_temp.ort(U1) = 90
     and (select durum from belgeler where id = pg_temp.c('GIR2')::uuid) = 'iptal', format('%s ort %s', r, pg_temp.ort(U1)));
  perform pg_temp.k('İptal satırları asıl satırlara bağlı ve aynı maliyetle',
     (select bool_and(t.ters_kayit_id = o.id and t.miktar = -o.miktar and t.birim_maliyet = o.birim_maliyet)
        from stok_defteri t join stok_defteri o on o.id = t.ters_kayit_id where t.belge_id = pg_temp.c('GIR2')::uuid and t.islem = 'iptal'));
  r := pg_temp.iptal(pg_temp.c('GIR2'), 'ikinci kez');
  perform pg_temp.k('Aynı belge iki kez iptal edilemez', (r->>'zaten')::boolean and (select count(*) from stok_defteri where belge_id = pg_temp.c('GIR2')::uuid) = 2, r::text);

  -- 11) iptal stoku eksiye düşürecekse reddedilir (ilk girişin 10 adedi artık yok)
  select id::text into idx from belgeler where no = pg_temp.c('GIR1_NO');
  r := pg_temp.iptal(idx, 'mal satılmış olsa da');
  perform pg_temp.k('Stoku eksiye düşürecek iptal reddedilir, belge onaylı kalır', r ? 'hata' and (select durum from belgeler where id = idx::uuid) = 'onayli', r->>'hata');
  perform pg_temp.k('İptal nedeni zorunlu', (pg_temp.iptal(pg_temp.c('TRF1'), '')) ? 'hata');

  -- 12) transfer iptali: D2'deki 4 adet D1'e geri döner, ortalama değişmez
  r := pg_temp.iptal(pg_temp.c('TRF1'), 'yanlış depo seçildi');
  perform pg_temp.k('Transfer iptali: hedef 4→0, kaynak 1→5, ortalama değişmez', pg_temp.bakiye(U1, D2) = 0 and pg_temp.bakiye(U1, D1) = 5 and pg_temp.ort(U1) = 90, r::text);

  -- 13) ortalama maliyet: ondalıklı örnek. U5: 3 × 10,50 + 7 × 11,25 → 11,0250; 4 çıkış (−44,10); + 6 × 12 → 11,5125
  perform pg_temp.onayla((pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 3, 'birim_maliyet', 10.50))))->>'id');
  perform pg_temp.onayla((pg_temp.kaydet('GIR', D2, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 7, 'birim_maliyet', 11.25))))->>'id');
  perform pg_temp.k('Ortalama (iki depoya giriş, firma geneli): 3×10,50 + 7×11,25 → 11,0250', pg_temp.ort(U5) = 11.025, pg_temp.ort(U5)::text);
  r := pg_temp.kaydet('CIK', D2, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 4))); idx := r->>'id'; perform pg_temp.onayla(idx);
  perform pg_temp.k('Çıkış ortalamayla: 4 × 11,025 = −44,10', (select tutar from stok_defteri where belge_id = idx::uuid) = -44.10 and pg_temp.ort(U5) = 11.025);
  perform pg_temp.onayla((pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 6, 'birim_maliyet', 12))))->>'id');
  perform pg_temp.k('Ortalama: 6×11,025 + 6×12 → 11,5125', pg_temp.ort(U5) = 11.5125 and pg_temp.toplam(U5) = 12, pg_temp.ort(U5)::text);
  r := pg_temp.kaydet('CIK', D2, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 3))); perform pg_temp.onayla(r->>'id');
  perform pg_temp.onayla((pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 9))))->>'id');
  perform pg_temp.k('Stok sıfırlanınca yeni giriş maliyeti doğrudan ortalama olur', pg_temp.toplam(U5) = 0
     and (select (pg_temp.onayla((pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U5, 'miktar', 2, 'birim_maliyet', 15))))->>'id')) ? 'no')
     and pg_temp.ort(U5) = 15, pg_temp.ort(U5)::text);

  -- 14) açılış fişi ve geçmiş yıl numarası
  r := pg_temp.kaydet('ACL', D2, jsonb_build_array(jsonb_build_object('urun_id', U2, 'miktar', 1, 'birim_maliyet', 70)), null, make_date(v_yil::int - 1, 12, 31));
  r := pg_temp.onayla(r->>'id');
  perform pg_temp.k('Numara belgenin yılına göre: geçen yıl tarihli açılış ACL-(yıl−1)-000001', r->>'no' = 'ACL-' || (v_yil::int - 1) || '-000001', r->>'no');
  perform pg_temp.k('Açılış girişi ortalamayı karıştırır: 2×50 + 1×70 → 56,6667', pg_temp.ort(U2) = 56.6667, pg_temp.ort(U2)::text);

  -- 15) doğrulamalar
  perform pg_temp.k('İleri tarihli belge açılamaz', (pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1)), null, current_date + 3)) ? 'hata');
  perform pg_temp.k('Pasif ürün eklenemez', pg_temp.c('UP') is null or (pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', pg_temp.c('UP'), 'miktar', 1)))) ? 'hata');
  perform pg_temp.k('Pasif depo seçilemez', pg_temp.c('DP') is null or (pg_temp.kaydet('CIK', pg_temp.c('DP'), jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1)))) ? 'hata');
  perform pg_temp.k('Aynı ürün bir belgede iki satır olamaz',
     (pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1), jsonb_build_object('urun_id', U1, 'miktar', 1)))) ? 'hata');
  perform pg_temp.k('Girişte birim maliyet zorunlu', (pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1)))) ? 'hata');
  perform pg_temp.k('Sıfır ya da eksi miktar girilemez', (pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 0)))) ? 'hata');

  -- 16) sürüm: eski sürümle düzenleme ve onay reddedilir
  r := pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1))); id3 := r->>'id';
  r := pg_temp.j(format('select belge_kaydet(%L::jsonb)', jsonb_build_object('id', id3, 'surum', 1, 'depo_id', D1, 'satirlar', jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 2)))));
  r2 := pg_temp.j(format('select belge_kaydet(%L::jsonb)', jsonb_build_object('id', id3, 'surum', 1, 'depo_id', D1, 'satirlar', jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 3)))));
  perform pg_temp.k('Eşzamanlı düzenleme: eski sürümle kaydetme reddedilir', (r->>'surum')::int = 2 and r2 ? 'hata'
     and (select miktar from belge_satirlari where belge_id = id3::uuid) = 2, r2->>'hata');
  r := pg_temp.j(format('select belge_onayla(%L, 1)', id3));
  perform pg_temp.k('Onay, görülen sürümle yapılır (eski sürümle onay reddedilir)', r ? 'hata' and (select durum from belgeler where id = id3::uuid) = 'taslak', r->>'hata');
  perform pg_temp.set('TASLAK_Y', id3);
end $$;

-- ========== değiştirilemezlik: sahip (veritabanı yöneticisi) bağlantısıyla bile ==========
select pg_temp.olarak(null);
do $$
declare b text := (select id::text from belgeler where durum = 'onayli' order by onay_zaman limit 1); d bigint := (select min(id) from stok_defteri);
begin
  perform pg_temp.k('Onaylı belge doğrudan değiştirilemez', pg_temp.hata(format('update belgeler set aciklama = %L where id = %L', 'x', b)) is not null);
  perform pg_temp.k('Onaylı belge silinemez', pg_temp.hata(format('delete from belgeler where id = %L', b)) is not null);
  perform pg_temp.k('Onaylı belgenin satırı değiştirilemez', pg_temp.hata(format('update belge_satirlari set miktar = 99 where belge_id = %L', b)) is not null);
  perform pg_temp.k('Onaylı belgeye satır eklenemez', pg_temp.hata(format('insert into belge_satirlari (belge_id, sira, urun_id, miktar) values (%L, 99, %L, 1)', b, pg_temp.c('U6'))) is not null);
  perform pg_temp.k('Onaylı belgenin satırı silinemez', pg_temp.hata(format('delete from belge_satirlari where belge_id = %L', b)) is not null);
  perform pg_temp.k('Stok defteri değiştirilemez', pg_temp.hata(format('update stok_defteri set miktar = 999 where id = %s', d)) is not null);
  perform pg_temp.k('Stok defteri silinemez', pg_temp.hata(format('delete from stok_defteri where id = %s', d)) is not null);
  perform pg_temp.k('Stok defteri toplu silinemez (TRUNCATE)', pg_temp.hata('truncate stok_defteri cascade') is not null);
  perform pg_temp.k('Depo bakiyesi doğrudan değiştirilemez', pg_temp.hata('update stok_bakiye set miktar = miktar + 1') is not null);
  perform pg_temp.k('Ortalama maliyet doğrudan değiştirilemez', pg_temp.hata('update urun_maliyet set ort_maliyet = 1') is not null);
  perform pg_temp.k('Numara sayacı doğrudan değiştirilemez', pg_temp.hata('update belge_sayac set son_no = 0') is not null);
  perform pg_temp.k('Deftere elle satır eklenemez', pg_temp.hata(format(
     'insert into stok_defteri (tarih, belge_id, belge_no, tur, islem, urun_id, depo_id, miktar, birim_maliyet, tutar, onceki_miktar, sonraki_miktar, toplam_onceki, toplam_sonraki, ort_sonraki, kullanici) values (current_date, %L, %L, %L, %L, %L, %L, 1, 1, 1, 0, 1, 0, 1, 1, %L)',
     b, 'X', 'GIR', 'onay', pg_temp.c('U1'), pg_temp.c('D1'), 'x')) is not null);
  -- motor bayrağı elle açılsa bile onaylı belgenin alanları değişmez
  perform set_config('akcan.motor', 'on', true);
  perform pg_temp.k('Motor bayrağı açık olsa da onaylı belgenin alanı değiştirilemez', pg_temp.hata(format('update belgeler set depo_id = %L where id = %L', pg_temp.c('D2'), b)) is not null);
  perform pg_temp.k('Motor bayrağı açık olsa da onaylı belge silinemez', pg_temp.hata(format('delete from belgeler where id = %L', b)) is not null);
  perform pg_temp.k('Motor bayrağı açık olsa da defter değiştirilemez', pg_temp.hata(format('delete from stok_defteri where id = %s', d)) is not null);
  perform set_config('akcan.motor', '', true);
end $$;

-- ========== kasiyer ==========
select pg_temp.olarak(pg_temp.c('K'));
do $$
declare r jsonb; v_id text; D1 text := pg_temp.c('D1'); D2 text := pg_temp.c('D2'); U1 text := pg_temp.c('U1');
begin
  r := pg_temp.kaydet('CIK', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1))); v_id := r->>'id';
  perform pg_temp.k('Kasiyer çıkış taslağı açabilir', v_id is not null, r::text);
  perform pg_temp.k('Kasiyer transfer taslağı açabilir', (pg_temp.kaydet('TRF', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1)), D2)) ? 'id');
  perform pg_temp.k('Kasiyer sayım taslağı açabilir', (pg_temp.kaydet('SAY', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'sayilan', 1)))) ? 'id');
  perform pg_temp.k('Kasiyer giriş fişi açamaz', (pg_temp.kaydet('GIR', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1, 'birim_maliyet', 1)))) ? 'hata');
  perform pg_temp.k('Kasiyer açılış fişi açamaz', (pg_temp.kaydet('ACL', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 1, 'birim_maliyet', 1)))) ? 'hata');
  perform pg_temp.k('Kasiyer sayımda maliyet giremez', (pg_temp.kaydet('SAY', D1, jsonb_build_array(jsonb_build_object('urun_id', U1, 'sayilan', 1, 'birim_maliyet', 5)))) ? 'hata');
  perform pg_temp.k('Kasiyer belge onaylayamaz', (pg_temp.onayla(v_id)) ? 'hata' and (select durum from belgeler where id = v_id::uuid) = 'taslak');
  perform pg_temp.k('Kasiyer belge iptal edemez', (pg_temp.iptal((select id::text from belgeler where durum = 'onayli' limit 1), 'kasiyer denemesi')) ? 'hata');
  perform pg_temp.k('Kasiyer yöneticinin taslağını değiştiremez', (pg_temp.j(format('select belge_kaydet(%L::jsonb)', jsonb_build_object('id', pg_temp.c('TASLAK_Y'), 'surum', 2, 'depo_id', D1,
     'satirlar', jsonb_build_array(jsonb_build_object('urun_id', U1, 'miktar', 5)))))) ? 'hata');
  perform pg_temp.k('Kasiyer tablolara doğrudan yazamaz', pg_temp.hata(format('update belgeler set aciklama = %L', 'x')) is not null
     and pg_temp.hata(format('insert into stok_bakiye (urun_id, depo_id, miktar) values (%L, %L, 100)', U1, D1)) is not null);
  perform pg_temp.k('Kasiyer maliyet göremez: defter, satır maliyeti, ortalama',
     (select count(*) from stok_defteri) = 0 and (select count(*) from belge_satirlari) = 0 and (select count(*) from urun_maliyet) = 0
     and (select count(*) from stok_defteri_p) > 0 and not exists (select 1 from belge_satirlari_p where birim_maliyet is not null));
  perform pg_temp.k('Kasiyer depo bakiyelerini ve belge başlıklarını görür', (select count(*) from stok_bakiye) > 0 and (select count(*) from belgeler) > 0);
  r := pg_temp.j(format('select belge_taslak_sil(%L)', v_id));
  perform pg_temp.k('Kasiyer kendi taslağını silebilir', r ? 'ok' and not exists (select 1 from belgeler where id = v_id::uuid), r::text);
end $$;

-- ========== giriş yapmamış ==========
select pg_temp.olarak('anon');
do $$ begin
  perform pg_temp.k('Giriş yapmamış kullanıcı belge fonksiyonlarını çağıramaz', pg_temp.hata('select belge_kaydet(''{}''::jsonb)') like '%permission denied%');
  perform pg_temp.k('Giriş yapmamış kullanıcı belge tablolarını okuyamaz', pg_temp.hata('select count(*) from stok_bakiye') like '%permission denied%');
end $$;

-- ========== tutarlılık ve izlenebilirlik ==========
select pg_temp.olarak(null);
do $$ begin
  perform pg_temp.k('Depo bakiyesi = defter toplamı (her ürün × depo)', not exists (
     select 1 from stok_bakiye b full join (select urun_id, depo_id, sum(miktar) s from stok_defteri group by 1, 2) d using (urun_id, depo_id)
     where coalesce(b.miktar, 0) <> coalesce(d.s, 0)));
  perform pg_temp.k('Ürün toplamı = depo bakiyeleri toplamı', not exists (
     select 1 from urun_maliyet m left join (select urun_id, sum(miktar) s from stok_bakiye group by 1) b using (urun_id) where m.toplam_miktar <> coalesce(b.s, 0)));
  perform pg_temp.k('Defter zinciri: her satırda sonraki = önceki + miktar', not exists (select 1 from stok_defteri where sonraki_miktar <> onceki_miktar + miktar or toplam_sonraki <> toplam_onceki + miktar));
  perform pg_temp.k('Hiçbir depoda eksi stok yok', not exists (select 1 from stok_bakiye where miktar < 0));
  perform pg_temp.k('Numaralar her tür ve yılda boşluksuz ve benzersiz', not exists (
     select 1 from (select tur, yil, count(*) n, max(sira_no) m, count(distinct no) d from belgeler where no is not null group by 1, 2) x where n <> m or d <> n));
  perform pg_temp.k('Her hareket kullanıcı, tarih ve belge numarası taşır', not exists (select 1 from stok_defteri where kullanici is null or zaman is null or belge_no is null or belge_no !~ '^[A-Z]{3}-[0-9]{4}-[0-9]{6}$'));
  perform pg_temp.k('Onaylı belgelerde onaylayan ve onay zamanı dolu', not exists (select 1 from belgeler where durum <> 'taslak' and (onaylayan is null or onay_zaman is null)));
  perform pg_temp.k('İşlem geçmişine (denetim) belge ekleme, onay ve iptal düştü', (select count(*) from denetim where tablo = 'belgeler' and islem = 'ekleme') > 0
     and exists (select 1 from denetim where tablo = 'belgeler' and yeni ->> 'durum' = 'onayli' and eposta = pg_temp.c('Y'))
     and exists (select 1 from denetim where tablo = 'belgeler' and yeni ->> 'durum' = 'iptal'));
  perform pg_temp.k('Mevcut stok tabloları değişmedi (urunler.stok, urun_depo_stok parmak izi aynı)', pg_temp.iz() = pg_temp.c('IZ_ONCE'));
end $$;

\o
-- ---------- sonuç ----------
\pset footer off
select sira as "#", case when ok then 'GEÇTİ' else 'KALDI' end as sonuc, test, coalesce(left(detay, 160), '') as detay from sonuc order by sira;
select count(*) filter (where ok) as gecen, count(*) filter (where not ok) as kalan, count(*) as toplam from sonuc;
-- her durumda geri al; başarısız test varsa psql hata koduyla çıksın
select count(*) filter (where not ok) as kalan from sonuc \gset
rollback;
select case when :kalan > 0 then (:kalan || ' test başarısız')::int end as basarisiz_test_var;
