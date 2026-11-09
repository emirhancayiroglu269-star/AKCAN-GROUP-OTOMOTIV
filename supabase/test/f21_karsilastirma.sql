-- F2.1 · Faz 1 ve BizimHesap tablolarının sayı + içerik özeti (YALNIZ OKUR). Başlangıçta ve her aşamadan sonra çalıştırılır;
-- "faz1" bölümü her seferinde birebir aynı olmalıdır. "yeni" bölümü F2.1 tablolarının sayılarıdır, "denetim" işlem geçmişi.
select jsonb_build_object(
  'faz1', jsonb_build_object(
    'belge_turleri',   (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.kod), ''))) from belge_turleri x),
    'belgeler',        (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from belgeler x),
    'belge_satirlari', (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from belge_satirlari x),
    'stok_defteri',    (select jsonb_build_object('n', count(*), 'son', max(x.id), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from stok_defteri x),
    'stok_bakiye',     (select jsonb_build_object('n', count(*), 'toplam', sum(x.miktar), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id, x.depo_id), ''))) from stok_bakiye x),
    'urun_maliyet',    (select jsonb_build_object('n', count(*), 'deger', sum(x.toplam_deger), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id), ''))) from urun_maliyet x),
    'belge_sayac',     (select jsonb_build_object('n', count(*), 'degerler', jsonb_object_agg(x.tur || x.yil, x.son_no)) from belge_sayac x),
    'urun_turu',       (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id), ''))) from urun_turu x),
    'urunler',         (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from urunler x),
    'urun_depo_stok',  (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.urun_id, x.depo_id), ''))) from urun_depo_stok x),
    'rapor_satirlari', (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from rapor_satirlari x),
    'cariler',         (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from cariler x),
    'depolar',         (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.id), ''))) from depolar x),
    'kullanicilar',    (select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(md5(to_jsonb(x)::text), '' order by x.eposta), ''))) from kullanicilar x),
    -- korunan taslaklar: kimlik, tür, depo, durum, sürüm, satır sayısı ve satır içerik özeti
    'taslaklar',       (select jsonb_agg(jsonb_build_object('id', b.id, 'tur', b.tur, 'depo', b.depo_id, 'durum', b.durum, 'surum', b.surum,
                              'satir', (select count(*) from belge_satirlari s where s.belge_id = b.id),
                              'satir_md5', (select md5(coalesce(string_agg(md5(to_jsonb(s)::text), '' order by s.id), '')) from belge_satirlari s where s.belge_id = b.id))
                              order by b.id) from belgeler b where b.durum = 'taslak'),
    -- Faz 1 / BizimHesap tablolarındaki tetikleyiciler (iç tetikleyiciler dahil: yeni bir FK eklenseydi burada görünürdü)
    'tetikleyiciler',  (select md5(string_agg(t.tgrelid::regclass::text || ':' || t.tgname || ':' || t.tgisinternal, ',' order by t.tgrelid::regclass::text, t.tgname))
                          from pg_trigger t where t.tgrelid in ('public.belge_turleri'::regclass, 'public.belgeler'::regclass, 'public.belge_satirlari'::regclass,
                            'public.stok_defteri'::regclass, 'public.stok_bakiye'::regclass, 'public.urun_maliyet'::regclass, 'public.belge_sayac'::regclass,
                            'public.urun_turu'::regclass, 'public.urunler'::regclass, 'public.urun_depo_stok'::regclass, 'public.rapor_satirlari'::regclass,
                            'public.cariler'::regclass, 'public.depolar'::regclass, 'public.kullanicilar'::regclass)),
    'tetikleyici_n',   (select count(*) from pg_trigger t where t.tgrelid in ('public.belge_turleri'::regclass, 'public.belgeler'::regclass, 'public.belge_satirlari'::regclass,
                            'public.stok_defteri'::regclass, 'public.stok_bakiye'::regclass, 'public.urun_maliyet'::regclass, 'public.belge_sayac'::regclass,
                            'public.urun_turu'::regclass, 'public.urunler'::regclass, 'public.urun_depo_stok'::regclass, 'public.rapor_satirlari'::regclass,
                            'public.cariler'::regclass, 'public.depolar'::regclass, 'public.kullanicilar'::regclass)),
    -- Faz 1 (ve Faz 0) fonksiyonlarının gövde özeti: hiçbiri yeniden tanımlanmamalı
    'fonksiyonlar',    (select md5(string_agg(p.proname || ':' || md5(p.prosrc) || ':' || coalesce(array_to_string(p.proconfig, ';'), ''), ',' order by p.proname, p.oid))
                          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname in ('belge_kaydet', 'belge_onayla', 'belge_iptal', 'belge_taslak_sil', '_hareket', '_kilitle', '_kim',
                           'acilis_taslagi_olustur', 'acilis_istisnalari', 'urun_turu_belirle', 'urun_turu_bul', 'hizmet_adayi_mi', '_stoklu_mu', '_belge_koru',
                           '_satir_koru', '_defter_koru', '_motor_tablo_koru', '_truncate_yok', '_miktar_yaz', '_satir_tur_kontrol', '_defter_tur_kontrol',
                           '_urun_turu_koru', 'denetim_tg', 'benim_rolum')),
    'fonksiyon_n',     (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname in ('belge_kaydet', 'belge_onayla', 'belge_iptal', 'belge_taslak_sil', '_hareket', '_kilitle', '_kim',
                           'acilis_taslagi_olustur', 'acilis_istisnalari', 'urun_turu_belirle', 'urun_turu_bul', 'hizmet_adayi_mi', '_stoklu_mu', '_belge_koru',
                           '_satir_koru', '_defter_koru', '_motor_tablo_koru', '_truncate_yok', '_miktar_yaz', '_satir_tur_kontrol', '_defter_tur_kontrol',
                           '_urun_turu_koru', 'denetim_tg', 'benim_rolum'))
  ),
  'denetim', (select jsonb_build_object('n', count(*), 'son', max(id), 'f21_tablolari', count(*) filter (where tablo in ('tedarikciler', 'kopru_baslangic', 'kopru_kayit'))) from denetim),
  'yeni', (select jsonb_object_agg(c.relname, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text::int)
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and c.relname in ('tedarikciler', 'kopru_baslangic', 'kopru_kayit', 'alis_taslak', 'alis_taslak_satir',
                                                                            'deneme_cari', 'deneme_fatura', 'deneme_fatura_satir'))
) as ozet;
