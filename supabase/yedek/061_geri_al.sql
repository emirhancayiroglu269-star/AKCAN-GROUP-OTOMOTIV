-- 061 belge motorunu kaldırır (geri alma). Mevcut tablolara (urunler, urun_depo_stok, depolar…) DOKUNMAZ.
-- DİKKAT: belge motorunun tüm belgelerini ve AKCAN stok defterini siler. Canlıda yalnız onaylı bir geri alma kararıyla çalıştırılır.
begin;
drop function if exists public.belge_kaydet(jsonb), public.belge_onayla(uuid, int), public.belge_iptal(uuid, text), public.belge_taslak_sil(uuid);
drop function if exists public._hareket(public.belgeler, text, bigint, uuid, uuid, numeric, numeric, text, bigint, text, uuid);
drop function if exists public._kilitle(uuid[], jsonb), public._kim();
drop view if exists public.belge_satirlari_p, public.stok_defteri_p;
drop table if exists public.stok_bakiye, public.urun_maliyet, public.stok_defteri, public.belge_satirlari, public.belgeler, public.belge_sayac, public.belge_turleri cascade;
drop function if exists public._belge_koru(), public._satir_koru(), public._defter_koru(), public._motor_tablo_koru(), public._truncate_yok();
commit;
