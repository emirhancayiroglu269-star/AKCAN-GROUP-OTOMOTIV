-- F2.1 Aşama A · otomatik testler (S23–S32 + koruma testleri). Tek DO bloğu; sonuçları HATA MESAJI olarak döndürür,
-- böylece yaptığı her şey (kesim kaydı, köprü kayıtları, alış taslakları, deneme tedarikçileri, işlem geçmişi satırları,
-- testin yaptığı deneme verisi değişiklikleri ve temizliği) kesinlikle GERİ ALINIR. Kalıcı iz bırakmaz.
-- Ön koşul: 065, 066, 067 kurulu. Deneme verisi yüklü değilse test içinde yüklenir (o da geri alınır).
-- Sonuç satırı: "F21_SONUC gecen=N kalan=M | ..." — kalan 0 olmalı.
do $$
declare
  y   text := (select eposta from kullanicilar where rol = 'yonetici' and aktif order by eposta limit 1);
  ka  text := (select eposta from kullanicilar where rol = 'kasiyer' and aktif order by eposta limit 1);
  sb  uuid := (select id from depolar where ad ilike 'SULTANBEYL%' and aktif order by ad limit 1);
  vb  uuid := (select id from depolar where ad ilike 'VEL%BABA%' and aktif order by ad limit 1);
  ref timestamptz := '2026-11-07 17:20:05+03';
  -- Faz 1 ve BizimHesap tablolarının özeti (işlem içinde önce/sonra karşılaştırılır)
  q constant text := $q$
    select md5(concat_ws('|',
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.kod), '')) from belge_turleri x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), '')) from belgeler x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), '')) from belge_satirlari x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), '')) from stok_defteri x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id, x.depo_id), '')) from stok_bakiye x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id), '')) from urun_maliyet x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.tur, x.yil), '')) from belge_sayac x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id), '')) from urun_turu x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), '')) from urunler x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id, x.depo_id), '')) from urun_depo_stok x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), '')) from rapor_satirlari x),
      (select md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), '')) from cariler x),
      (select count(*) from pg_trigger t where t.tgrelid in ('public.belgeler'::regclass, 'public.belge_satirlari'::regclass, 'public.stok_defteri'::regclass,
         'public.stok_bakiye'::regclass, 'public.urun_maliyet'::regclass, 'public.belge_sayac'::regclass, 'public.urunler'::regclass, 'public.depolar'::regclass,
         'public.urun_depo_stok'::regclass, 'public.rapor_satirlari'::regclass, 'public.cariler'::regclass, 'public.belge_turleri'::regclass, 'public.urun_turu'::regclass))))
  $q$;
  once text; sonra text; dn0 bigint; r jsonb; n int; t record; tid bigint; v_oneri timestamptz; v_bek timestamptz;
  gecen int := 0; kalan int := 0; rapor text := '';
begin
  execute q into once;
  dn0 := coalesce((select max(id) from denetim), 0);
  if sb is null or vb is null or y is null or ka is null then raise exception 'F21_SONUC test ön koşulu eksik (depo / kullanıcı)'; end if;
  if not exists (select 1 from deneme_fatura) then perform public.deneme_veri_yukle(ref, sb, vb); end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', y)::text, true);

  -- K01 kesim önerisi (Sultanbeyli): stok kopyasının son değişiminden türetilir, doğrulanmamış olarak işaretlenir
  r := public.kopru_kesim_oner(sb);
  v_bek := (select date_trunc('second', max(degisim)) + interval '1 second' from urun_depo_stok
             where depo_id = sb and degisim <= (select min(olusturma) from belgeler where tur = 'ACL' and durum = 'onayli' and depo_id = sb));
  v_oneri := (r->>'oneri')::timestamptz;
  if v_oneri = v_bek and (r->>'dogrulanmis')::boolean = false then gecen := gecen + 1; rapor := rapor || ' [K01 öneri ' || to_char(v_oneri at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI:SS') || ', doğrulanmamış]';
  else kalan := kalan + 1; rapor := rapor || ' [K01 KALDI ' || r::text || ']'; end if;

  -- K02 Velibaba için öneri yok (depo açılmadı)
  r := public.kopru_kesim_oner(vb);
  if r->>'oneri' is null then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [K02 KALDI]'; end if;

  -- K03 kesim yokken köprü: Sultanbeyli faturaları işlenmez ve kayıt açılmaz; Velibaba faturası "depo açılmadı"
  r := public.alis_kopru_calistir('deneme');
  if (r->>'kesim_yok')::int = 9 and r->'yeni' = '{"depo_acilmadi": 1}'::jsonb and (select count(*) from alis_taslak) = 0 and (select count(*) from kopru_kayit) = 1
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [K03 KALDI ' || r::text || ']'; end if;

  -- S31a Velibaba için kesim onayı reddedilir
  begin perform public.kopru_kesim_onayla(vb, 'alis', ref, 'F2.1 test gerekçesi'); kalan := kalan + 1; rapor := rapor || ' [S31a Velibaba kesimi ONAYLANDI]';
  exception when others then if sqlerrm like 'Depo açılmadı%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S31a KALDI: ' || sqlerrm || ']'; end if; end;

  -- S5a kasiyer kesim onaylayamaz
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', ka)::text, true);
  begin perform public.kopru_kesim_onayla(sb, 'alis', ref, 'F2.1 test gerekçesi'); kalan := kalan + 1; rapor := rapor || ' [S5a kasiyer kesim ONAYLADI]';
  exception when others then if sqlerrm like '%yalnız yönetici%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S5a KALDI: ' || sqlerrm || ']'; end if; end;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', y)::text, true);

  -- K04 Sultanbeyli alış ve satış kesimi (YALNIZ bu işlem içinde; test sonunda geri alınır)
  perform public.kopru_kesim_onayla(sb, 'alis', ref, 'F2.1 test gerekçesi');
  perform public.kopru_kesim_onayla(sb, 'satis', ref, 'F2.1 test gerekçesi');
  if (select count(*) from kopru_baslangic) = 2 then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [K04 KALDI]'; end if;

  -- S31b onaylı kesim değiştirilemez / silinemez / ikinci kez onaylanamaz / doğrudan yazılamaz
  begin perform public.kopru_kesim_onayla(sb, 'alis', ref - interval '1 hour', 'F2.1 ikinci onay'); kalan := kalan + 1; rapor := rapor || ' [S31b ikinci onay KABUL]';
  exception when others then if sqlerrm like '%zaten onaylı%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S31b KALDI: ' || sqlerrm || ']'; end if; end;
  begin perform set_config('akcan.kopru', 'on', true); update kopru_baslangic set kesim_ani = kesim_ani - interval '1 hour'; kalan := kalan + 1; rapor := rapor || ' [S31c kesim DEĞİŞTİ]';
  exception when others then if sqlerrm like 'Kesim kaydı onaydan sonra%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S31c KALDI: ' || sqlerrm || ']'; end if; end;
  perform set_config('akcan.kopru', '', true);
  begin delete from kopru_baslangic; kalan := kalan + 1; rapor := rapor || ' [S31d kesim SİLİNDİ]';
  exception when others then if sqlerrm like 'Kesim kaydı onaydan sonra%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S31d KALDI: ' || sqlerrm || ']'; end if; end;
  begin insert into kopru_baslangic (depo_id, akis, kesim_ani, dayanak, gerekce, onaylayan) values (vb, 'alis', ref, '{}', 'doğrudan yazım', 'x');
        kalan := kalan + 1; rapor := rapor || ' [G3a kesim DOĞRUDAN YAZILDI]';
  exception when others then if sqlerrm like '%yalnız kopru_kesim_onayla%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G3a KALDI: ' || sqlerrm || ']'; end if; end;

  -- K05 köprü (deneme kaynağı): 1 açılışa dahil, 3 belirsiz, 5 işlendi; Velibaba bekler
  r := public.alis_kopru_calistir('deneme');
  if r->'yeni' = '{"acilista": 1, "belirsiz": 3, "islendi": 5}'::jsonb and (r->>'depo_acilmadi_bekleyen')::int = 1 and (r->>'kesim_yok')::int = 0
     and (select count(*) from kopru_kayit) = 10 and (select count(*) from alis_taslak) = 5 and (select count(*) from alis_taslak_satir) = 14
     and (select count(*) from tedarikciler where kaynak = 'deneme') = 3
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [K05 KALDI ' || r::text || ']'; end if;

  -- S23 açılışa dahil: kayıt var, taslak yok
  if (select karar from kopru_kayit where bh_belge_guid = 'DENEME-D01') = 'acilista' and not exists (select 1 from alis_taslak where bh_belge_guid = 'DENEME-D01')
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S23 KALDI]'; end if;

  -- S24 kesimden 1 saat sonra: tek alış taslağı (ara tabloda, deneme, belgesiz), tedarikçi ve tutarlar doğru
  select a.*, td.unvan into t from alis_taslak a left join tedarikciler td on td.id = a.tedarikci_id where a.bh_belge_guid = 'DENEME-D02';
  if t.kaynak = 'deneme' and t.belge_id is null and t.unvan = 'DENEME Tedarikçi A' and t.ara_toplam = 609.50 and t.kdv_toplam = 121.90 and t.genel_toplam = 731.40
     and (select count(*) from alis_taslak_satir where taslak_id = t.id) = 3 and (select count(*) from alis_taslak where bh_belge_guid = 'DENEME-D02') = 1
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S24 KALDI ' || coalesce(t.ara_toplam::text, '-') || ']'; end if;

  -- S25 güven aralığı ve saatsiz fatura → belirsiz
  if (select karar || '|' || karar_nedeni from kopru_kayit where bh_belge_guid = 'DENEME-D03') like 'belirsiz|%±10 dakikası%'
     and (select karar || '|' || karar_nedeni from kopru_kayit where bh_belge_guid = 'DENEME-D04') like 'belirsiz|Fatura saati yok%'
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S25 KALDI]'; end if;

  -- S26 geriye tarihli giriş → belirsiz
  if (select karar || '|' || karar_nedeni from kopru_kayit where bh_belge_guid = 'DENEME-D05') like 'belirsiz|%geriye tarihli%'
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S26 KALDI]'; end if;

  -- S30 Velibaba: depo açılmadı, taslak yok; 5 açılış taslağı sürüm 1
  if (select karar from kopru_kayit where bh_belge_guid = 'DENEME-D08') = 'depo_acilmadi' and not exists (select 1 from alis_taslak where bh_belge_guid = 'DENEME-D08')
     and (select count(*) from belgeler where tur = 'ACL' and durum = 'taslak' and depo_id = vb and surum = 1) = (select count(*) from belgeler where tur = 'ACL' and durum = 'taslak' and depo_id = vb)
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S30 KALDI]'; end if;

  -- U1 uyarılar: eşleşmeyen ürün, hizmet, sıfır maliyet
  if (select string_agg(array_to_string(s.uyarilar, ','), '/' order by s.sira) from alis_taslak_satir s join alis_taslak a on a.id = s.taslak_id where a.bh_belge_guid = 'DENEME-D09')
       = 'urun_eslesmedi/hizmet/sifir_maliyet'
     and (select uyari_sayisi from alis_taslak where bh_belge_guid = 'DENEME-D09') = 3
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [U1 KALDI]'; end if;

  -- S4 fatura altı 50,00 TL iskonto satırlara tutar oranında dağılır, net birim maliyet doğru
  if (select string_agg(s.fatura_alti_pay || ':' || s.net_birim_maliyet, '/' order by s.sira) from alis_taslak_satir s join alis_taslak a on a.id = s.taslak_id where a.bh_belge_guid = 'DENEME-D10')
       = '17.48:91.2600/23.60:246.4000/8.92:23.2700'
     and (select ara_toplam from alis_taslak where bh_belge_guid = 'DENEME-D10') = 522.00
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S4 KALDI]'; end if;

  -- S2 / S27a aynı faturalar yeniden aktarılır: yeni kayıt ve taslak açılmaz, sürümler değişmez
  r := public.alis_kopru_calistir('deneme');
  if r->'yeni' = '{}'::jsonb and (r->>'zaten')::int = 9 and (r->>'depo_acilmadi_bekleyen')::int = 1 and (select count(*) from kopru_kayit) = 10
     and (select count(*) from alis_taslak) = 5 and (select max(surum) from alis_taslak) = 1
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S2/S27a KALDI ' || r::text || ']'; end if;

  -- S27b aynı anahtarla ikinci kayıt veritabanında açılamaz (tekil indeks)
  begin perform set_config('akcan.kopru', 'on', true);
        insert into kopru_kayit (akis, kaynak, bh_belge_guid, depo_id, depo_ad, fatura_tarihi, ilk_gorulme, parmak_izi, karar)
        select akis, kaynak, bh_belge_guid, depo_id, depo_ad, fatura_tarihi, ilk_gorulme, 'x', 'hata' from kopru_kayit where bh_belge_guid = 'DENEME-D06';
        kalan := kalan + 1; rapor := rapor || ' [S27b ÇİFT KAYIT AÇILDI]';
  exception when unique_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [S27b KALDI: ' || sqlerrm || ']'; end;
  perform set_config('akcan.kopru', '', true);

  -- S28 taslaktaki fatura sonradan değişir: aynı taslak güncellenir, sürüm artar, ikinci taslak açılmaz
  update deneme_fatura_satir set miktar = 5 where fatura_guid = 'DENEME-D07' and sira = 1;
  r := public.alis_kopru_calistir('deneme');
  if (r->>'guncellenen')::int = 1 and (select surum from alis_taslak where bh_belge_guid = 'DENEME-D07') = 2
     and (select s.miktar from alis_taslak_satir s join alis_taslak a on a.id = s.taslak_id where a.bh_belge_guid = 'DENEME-D07' and s.sira = 1) = 5
     and (select count(*) from alis_taslak where bh_belge_guid = 'DENEME-D07') = 1 and (select count(*) from kopru_kayit) = 10
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S28 KALDI ' || r::text || ']'; end if;

  -- S29 deneme alış taslağı belgeye bağlanamaz (kısıt) ve köprü dışından değiştirilemez (tetikleyici)
  begin perform set_config('akcan.kopru', 'on', true); update alis_taslak set belge_id = gen_random_uuid() where bh_belge_guid = 'DENEME-D02';
        kalan := kalan + 1; rapor := rapor || ' [S29a BELGEYE BAĞLANDI]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [S29a KALDI: ' || sqlerrm || ']'; end;
  perform set_config('akcan.kopru', '', true);
  begin update alis_taslak set belge_id = gen_random_uuid() where bh_belge_guid = 'DENEME-D02'; kalan := kalan + 1; rapor := rapor || ' [S29b DEĞİŞTİ]';
  exception when others then if sqlerrm like '%yalnız köprü fonksiyonlarıyla%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S29b KALDI: ' || sqlerrm || ']'; end if; end;

  -- G1 tedarikçi: deneme ve gerçek kimlik karışamaz
  begin insert into tedarikciler (kaynak, bh_cari_id, unvan) values ('bh', 'DENEME-X', 'Gerçek gibi'); kalan := kalan + 1; rapor := rapor || ' [G1a]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [G1/G2 beklenmeyen: ' || sqlerrm || ']'; end;
  begin insert into tedarikciler (kaynak, bh_cari_id, unvan) values ('deneme', 'X1', 'DENEME Önek yok'); kalan := kalan + 1; rapor := rapor || ' [G1b]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [G1/G2 beklenmeyen: ' || sqlerrm || ']'; end;
  begin insert into tedarikciler (kaynak, bh_cari_id, unvan) values ('deneme', 'DENEME-X2', 'Unvan önek yok'); kalan := kalan + 1; rapor := rapor || ' [G1c]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [G1/G2 beklenmeyen: ' || sqlerrm || ']'; end;

  -- G2 köprü kaydı: deneme ve gerçek kimlik karışamaz
  perform set_config('akcan.kopru', 'on', true);
  begin insert into kopru_kayit (akis, kaynak, bh_belge_guid, fatura_tarihi, ilk_gorulme, parmak_izi, karar) values ('alis', 'deneme', 'ABC', current_date, now(), 'x', 'hata');
        kalan := kalan + 1; rapor := rapor || ' [G2a]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [G1/G2 beklenmeyen: ' || sqlerrm || ']'; end;
  begin insert into kopru_kayit (akis, kaynak, bh_belge_guid, fatura_tarihi, ilk_gorulme, parmak_izi, karar) values ('alis', 'bh', 'DENEME-Z', current_date, now(), 'x', 'hata');
        kalan := kalan + 1; rapor := rapor || ' [G2b]';
  exception when check_violation then gecen := gecen + 1; when others then kalan := kalan + 1; rapor := rapor || ' [G1/G2 beklenmeyen: ' || sqlerrm || ']'; end;
  perform set_config('akcan.kopru', '', true);

  -- G3b köprü kaydı köprü dışından yazılamaz; G4 köprü kaydı ve taslak silinemez (temizlik dışında)
  begin insert into kopru_kayit (akis, kaynak, bh_belge_guid, fatura_tarihi, ilk_gorulme, parmak_izi, karar) values ('alis', 'deneme', 'DENEME-Y', current_date, now(), 'x', 'hata');
        kalan := kalan + 1; rapor := rapor || ' [G3b DOĞRUDAN YAZILDI]';
  exception when others then if sqlerrm like '%yalnız köprü fonksiyonlarıyla%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G3b KALDI: ' || sqlerrm || ']'; end if; end;
  begin delete from kopru_kayit where bh_belge_guid = 'DENEME-D01'; kalan := kalan + 1; rapor := rapor || ' [G4a SİLİNDİ]';
  exception when others then if sqlerrm like '%silinemez%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G4a KALDI: ' || sqlerrm || ']'; end if; end;
  begin delete from alis_taslak where bh_belge_guid = 'DENEME-D02'; kalan := kalan + 1; rapor := rapor || ' [G4b SİLİNDİ]';
  exception when others then if sqlerrm like '%silinemez%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G4b KALDI: ' || sqlerrm || ']'; end if; end;

  -- G5 / S5 kasiyer: köprü, taslak, tedarikçi ve deneme tablolarında hiçbir satır görmez; kısa listede yalnız unvan/telefon
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', ka)::text, true);
  execute 'set local role authenticated';
  n := (select count(*) from alis_taslak) + (select count(*) from alis_taslak_satir) + (select count(*) from kopru_kayit) + (select count(*) from kopru_baslangic)
     + (select count(*) from tedarikciler) + (select count(*) from deneme_fatura_satir) + (select count(*) from deneme_fatura) + (select count(*) from deneme_cari);
  if n = 0 and (select count(*) from tedarikci_kisa) = 3 then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G5a kasiyer ' || n || ' satır gördü]'; end if;
  begin perform public.alis_kopru_calistir('deneme'); kalan := kalan + 1; rapor := rapor || ' [G5b kasiyer köprü ÇALIŞTIRDI]';
  exception when others then if sqlerrm like '%yalnız yönetici%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G5b KALDI: ' || sqlerrm || ']'; end if; end;
  begin perform public.kopru_belirsiz_karar(1, 'acilista', 'kasiyer denemesi'); kalan := kalan + 1; rapor := rapor || ' [G5c kasiyer KARAR VERDİ]';
  exception when others then if sqlerrm like '%yalnız yönetici%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G5c KALDI: ' || sqlerrm || ']'; end if; end;
  begin perform public.kopru_kesim_oner(sb); kalan := kalan + 1; rapor := rapor || ' [G5d kasiyer ÖNERİ GÖRDÜ]';
  exception when others then if sqlerrm like 'Yalnız yönetici%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G5d KALDI: ' || sqlerrm || ']'; end if; end;
  execute 'reset role';
  if (select string_agg(column_name::text, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'tedarikci_kisa') = 'id,unvan,telefon,aktif'
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G5e kısa listede fazla sütun]'; end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', y)::text, true);

  -- G6 belirsiz kararı yalnız bir kez: açılışa dahil / işle
  tid := (select id from kopru_kayit where bh_belge_guid = 'DENEME-D03');
  perform public.kopru_belirsiz_karar(tid, 'acilista', 'F2.1 test kararı');
  begin perform public.kopru_belirsiz_karar(tid, 'isle', 'F2.1 ikinci karar'); kalan := kalan + 1; rapor := rapor || ' [G6a İKİNCİ KARAR]';
  exception when others then if sqlerrm like 'Yalnız belirsiz kayda%' then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G6a KALDI: ' || sqlerrm || ']'; end if; end;
  perform public.kopru_belirsiz_karar((select id from kopru_kayit where bh_belge_guid = 'DENEME-D04'), 'isle', 'F2.1 test kararı');
  if (select karar from kopru_kayit where bh_belge_guid = 'DENEME-D03') = 'acilista' and (select karar from kopru_kayit where bh_belge_guid = 'DENEME-D04') = 'islendi'
     and (select count(*) from alis_taslak) = 6 and (select belge_id from alis_taslak where bh_belge_guid = 'DENEME-D04') is null
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G6b KALDI]'; end if;

  -- S32 / G7 Faz 1 ve BizimHesap tabloları test boyunca birebir aynı; işlem geçmişine yalnız F2.1 tablolarından satır düştü
  execute q into sonra;
  if sonra = once and not exists (select 1 from denetim where id > dn0 and tablo not in ('tedarikciler', 'kopru_baslangic', 'kopru_kayit'))
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [S32 FAZ 1 DEĞİŞTİ]'; end if;

  -- G8 deneme temizliği yalnız deneme kaynaklı kayıtları siler (test içinde; geri alınır)
  r := public.deneme_veri_temizle();
  execute q into sonra;
  if (select count(*) from kopru_kayit) = 0 and (select count(*) from alis_taslak) = 0 and (select count(*) from alis_taslak_satir) = 0
     and (select count(*) from tedarikciler) = 0 and (select count(*) from deneme_fatura) = 0 and (select count(*) from kopru_baslangic) = 2 and sonra = once
  then gecen := gecen + 1; else kalan := kalan + 1; rapor := rapor || ' [G8 KALDI ' || r::text || ']'; end if;

  raise exception 'F21_SONUC gecen=% kalan=% |%', gecen, kalan, rapor;
end $$;
