-- Her sabah e-Fatura kontrolü: Ödeal'den okunan faturalarla BizimHesap arasında fark varsa Asistan > Öneriler listesine yazar
-- (API anahtarı gerektirmez; asistan_efatura özetini kullanır). Aynı konuda 3 gün içinde öneri yazılmışsa tekrar yazmaz.
-- Son 2 günün gelen faturaları sayılmaz (henüz BizimHesap'a girilmemiş olabilir).
-- Türkçe sayı biçimi: 1.234,56
create or replace function public.tl(n numeric) returns text language sql immutable as $f$
  select translate(to_char(round(n, 2), 'FM999,999,990.00'), ',.', '.,') $f$;

create or replace function public.efatura_sabah_oneri()
returns void language plpgsql security definer set search_path = public as $$
declare
  o jsonb := public.asistan_efatura('{"gun":30}');
  gl jsonb; sl jsonb; gn int; gt numeric; sn int; st numeric; son timestamptz;
  liste text;
begin
  son := (o->>'odeal_son_okuma')::timestamptz;
  select coalesce(jsonb_agg(x), '[]'), count(*), coalesce(sum((x->>'tutar')::numeric), 0) into gl, gn, gt
    from jsonb_array_elements(o->'gelen_girilmemis') x where (x->>'tarih')::date < current_date - 1;
  sl := o->'satis_faturasi_bizimhesapta_yok'; sn := (o->>'satis_faturasi_bizimhesapta_yok_adet')::int; st := (o->>'satis_faturasi_bizimhesapta_yok_tutar_kdv_dahil')::numeric;

  if gn > 0 and not exists (select 1 from asistan_oneri where kaynak = 'efatura' and baslik like 'e-Fatura: gelen%' and zaman > now() - interval '3 days') then
    select string_agg(format('%s %s %s ₺', to_char((x->>'tarih')::date, 'DD.MM'), left(x->>'firma', 40), tl((x->>'tutar')::numeric)), '; ') into liste from jsonb_array_elements(gl) x;
    insert into asistan_oneri (kaynak, baslik, aciklama, oncelik)
    values ('efatura', format('e-Fatura: gelen %s fatura BizimHesap''a girilmemiş (%s ₺)', gn, tl(gt)),
      left(format('Son 30 günde tedarikçilerden gelen e-fatura alış ya da masraf olarak bulunamadı: %s. Satışlar & Alışlar > e-Fatura kontrol sekmesinden bakın; bilerek girilmeyenleri "Bilerek girilmedi" ile işaretleyin.', liste), 600), 2);
  end if;

  if sn > 0 and not exists (select 1 from asistan_oneri where kaynak = 'efatura' and baslik like 'e-Fatura: kesilen%' and zaman > now() - interval '3 days') then
    select string_agg(format('%s %s %s ₺', to_char((x->>'tarih')::date, 'DD.MM'), left(x->>'alici', 30), tl((x->>'tutar')::numeric)), '; ') into liste from jsonb_array_elements(sl) x;
    insert into asistan_oneri (kaynak, baslik, aciklama, oncelik)
    values ('efatura', format('e-Fatura: kesilen %s faturanın BizimHesap''ta satışı yok (%s ₺)', sn, tl(st)),
      left(format('Ödeal''den kesilmiş ama BizimHesap''ta aynı tutarda satışı bulunamayan faturalar (son 30 gün): %s. Satış ve stok eksik kalabilir; e-Fatura kontrol sekmesinden bakın.', liste), 600), 1);
  end if;

  if son is null or son < now() - interval '7 days' then
    if not exists (select 1 from asistan_oneri where kaynak = 'efatura' and baslik like 'e-Fatura: Ödeal%' and zaman > now() - interval '7 days') then
      insert into asistan_oneri (kaynak, baslik, aciklama, oncelik)
      values ('efatura', 'e-Fatura: Ödeal faturaları 7 gündür okunmadı',
        'Ödeal e-Fatura portalında Gelen, Gönderilen ve e-Arşiv sayfalarını açıp sol alttaki "Akcan: tümünü aktar" düğmesine basın; kontrol ancak güncel faturalarla doğru çalışır.', 3);
    end if;
  end if;
end $$;
revoke all on function public.efatura_sabah_oneri() from public, anon, authenticated;

-- her sabah 08:20 (Türkiye) = 05:20 UTC
select cron.unschedule('efatura-sabah') where exists (select 1 from cron.job where jobname = 'efatura-sabah');
select cron.schedule('efatura-sabah', '20 5 * * *', 'select public.efatura_sabah_oneri()');
