-- 062 (ürün türü + açılış taslağı) kaldırılır. urunler / urun_depo_stok tablolarına DOKUNMAZ.
begin;
drop trigger if exists satir_tur_kontrol on public.belge_satirlari;
drop trigger if exists defter_tur_kontrol on public.stok_defteri;
drop view if exists public.urun_turu_kontrol, public.belge_listesi;
drop function if exists public.urun_turu_belirle(uuid[], text, text), public.acilis_taslagi_olustur(uuid), public.acilis_istisnalari(uuid);
drop table if exists public.urun_turu cascade;
drop function if exists public._satir_tur_kontrol(), public._defter_tur_kontrol(), public._urun_turu_koru(), public._stoklu_mu(uuid), public.urun_turu_bul(uuid), public.hizmet_adayi_mi(text, text);
commit;
