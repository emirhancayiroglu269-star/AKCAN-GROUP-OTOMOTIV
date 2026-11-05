-- Asistan aracı: Ödeal e-Fatura ↔ BizimHesap karşılaştırmasının özeti (salt okunur, yalnız service_role).
-- Sitedeki e-Fatura kontrol sekmesinin sadeleştirilmiş hali: tutar ±%0,5 (en az 1 ₺).
--  gelen: aynı tutarda BizimHesap alış belgesi ±10 gün ya da masraf ±15 gün yoksa "girilmemiş"
--  giden/e-arşiv: aynı tutarda BizimHesap satış belgesi (fatura 5 gün önce – 120 gün sonra) yoksa "satışı yok"
-- "Bilerek girilmedi" işaretlenenler ve iptal edilenler sayılmaz.
create or replace function public.asistan_efatura(p jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g int := least(greatest(coalesce((p->>'gun')::int, 30), 1), 365);
  r jsonb;
begin
  with belge as (
    select belge_guid, tur, min(tarih) tarih, max(cari_ad) cari, sum(toplam) tutar
    from rapor_satirlari where not coalesce(gecersiz, false) and not coalesce(iade, false) and belge_guid is not null
      and tarih > current_date - g - 130 group by 1, 2
  ), od as (
    select * from odeal_fatura
    where tarih > current_date - g and kontrol is null and not coalesce((ham->>'iptal')::boolean, false)
      and coalesce(durum, '') !~* 'iptal|red' and upper(coalesce(tip, 'SATIS')) <> 'IADE' and tutar is not null
  ), gelen_eksik as (
    select o.* from od o where o.yon = 'gelen'
      and not exists (select 1 from belge b where b.tur = 'alis' and abs(b.tutar - o.tutar) <= greatest(1, o.tutar * 0.005) and abs(b.tarih - o.tarih) <= 10)
      and not exists (select 1 from masraflar m where abs(m.tutar - o.tutar) <= greatest(1, o.tutar * 0.005) and abs(m.tarih::date - o.tarih) <= 15)
  ), satis_eksik as (
    select o.* from od o where o.yon in ('giden', 'arsiv')
      and not exists (select 1 from belge b where b.tur = 'satis' and abs(b.tutar - o.tutar) <= greatest(1, o.tutar * 0.005) and o.tarih - b.tarih between -5 and 120)
  )
  select jsonb_build_object(
    'son_gun', g,
    'odeal_son_okuma', (select max(guncelleme) from odeal_fatura),
    'okunan', (select jsonb_object_agg(yon, n) from (select yon, count(*) n from odeal_fatura where tarih > current_date - g group by 1) x),
    'gelen_girilmemis_adet', (select count(*) from gelen_eksik), 'gelen_girilmemis_tutar_kdv_dahil', (select round(coalesce(sum(tutar), 0)) from gelen_eksik),
    'gelen_girilmemis', (select coalesce(jsonb_agg(jsonb_build_object('tarih', tarih, 'no', no, 'firma', karsi, 'tutar', tutar) order by tutar desc), '[]') from (select * from gelen_eksik order by tutar desc limit 10) t),
    'satis_faturasi_bizimhesapta_yok_adet', (select count(*) from satis_eksik), 'satis_faturasi_bizimhesapta_yok_tutar_kdv_dahil', (select round(coalesce(sum(tutar), 0)) from satis_eksik),
    'satis_faturasi_bizimhesapta_yok', (select coalesce(jsonb_agg(jsonb_build_object('tarih', tarih, 'no', no, 'alici', karsi, 'tur', yon, 'tutar', tutar) order by tutar desc), '[]') from (select * from satis_eksik order by tutar desc limit 10) t)
  ) into r;
  return r;
end $$;
revoke all on function public.asistan_efatura(jsonb) from public, anon, authenticated;
grant execute on function public.asistan_efatura(jsonb) to service_role;
