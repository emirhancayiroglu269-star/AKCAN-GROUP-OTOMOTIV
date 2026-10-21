-- BizimHesap /products yalnız aktif ürünleri döndürür: listede olmayan BH ürünü pasife alınmıştır.
-- Eşitleme servisi her turda tüm bh_id listesini gönderir. Liste mevcut aktiflerin %90'ından azsa hiçbir şey yapılmaz.
create or replace function public.bh_eksikleri_pasifle(p text[])
returns integer language plpgsql set search_path to 'public' as $$
declare mevcut int; n int;
begin
  select count(*) into mevcut from urunler where bh_id is not null and aktif;
  if coalesce(array_length(p, 1), 0) < greatest(100, mevcut * 0.9) then return -1; end if;
  update urunler set aktif = false, bh_guncelleme = now()
   where bh_id is not null and aktif and not (bh_id = any(p));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.bh_eksikleri_pasifle(text[]) from public, anon, authenticated;
grant execute on function public.bh_eksikleri_pasifle(text[]) to service_role;
