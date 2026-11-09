-- 067 geri alma: deneme tablolarını (içlerindeki tüm deneme kayıtlarıyla) ve yükleme/temizleme fonksiyonlarını kaldırır.
-- Faz 1 tablolarına ve gerçek BizimHesap verisine dokunmaz. Sıra: önce 067, sonra 066, sonra 065.
drop function if exists public.deneme_veri_yukle(timestamptz, uuid, uuid);
drop function if exists public.deneme_veri_temizle();
drop table if exists public.deneme_fatura_satir;
drop table if exists public.deneme_fatura;
drop table if exists public.deneme_cari;
