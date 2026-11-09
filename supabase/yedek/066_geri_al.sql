-- 066 geri alma: köprü fonksiyonlarını, koruma tetikleyicilerini ve köprü tablolarını (içlerindeki tüm kayıtlarla,
-- kesim kayıtları dahil) kaldırır. Faz 1 tablolarına dokunmaz. İşlem geçmişine (denetim) daha önce yazılmış satırlar
-- SİLİNMEZ; bu yüzden bu tam geri alma değildir. Sıra: önce 067, sonra 066, sonra 065.
drop function if exists public.kopru_belirsiz_karar(bigint, text, text);
drop function if exists public.alis_kopru_calistir(text);
drop function if exists public.kopru_kesim_onayla(uuid, text, timestamptz, text);
drop function if exists public.kopru_kesim_oner(uuid);
drop function if exists public._alis_taslak_yaz(bigint, bigint, text, jsonb);
drop function if exists public._kopru_alis_kaynak(text);
drop function if exists public._fatura_parmak_izi(jsonb, numeric);
drop function if exists public._kopru_depo_acik(uuid);
drop function if exists public._kopru_ad_norm(text);
drop function if exists public._kopru_fatura_zamani(date, time);
drop table if exists public.alis_taslak_satir;
drop table if exists public.alis_taslak;
drop table if exists public.kopru_kayit;
drop table if exists public.kopru_baslangic;
drop function if exists public._kopru_tablo_koru();
