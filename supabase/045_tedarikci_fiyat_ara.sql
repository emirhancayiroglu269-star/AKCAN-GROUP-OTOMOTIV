-- Ürün Ara → "Tedarikçi fiyatları": bir ürün (ve muadilleri) ya da aranan kod/OEM için tüm tedarikçilerin kayıtlı fiyatları.
-- Kaynaklar: tedarikci_maliyet (bizim kartlarla eşleşmiş fiyatlar: Otomarmara, Neko, Iron, Başbuğ, Özaş)
--            tedarikci_katalog (eklentinin okuduğu arama sonuçları: kod + OEM; bizde olmayan markalar da)
-- Fiyatlar KDV hariç birim alış. Yalnız yönetici (personel alış fiyatı görmez).
create or replace function public.tedarikci_fiyat_ara(p_kodlar text[] default '{}', p_urunler uuid[] default '{}')
returns table (kaynak text, tedarikci text, urun_id uuid, kod text, marka text, ad text, oem text, fiyat numeric, stok numeric, stok_var boolean, zaman timestamptz, eslesme text)
language plpgsql stable security definer set search_path = public as $$
declare n text[];
begin
  if benim_rolum() <> 'yonetici' then raise exception 'Tedarikçi fiyatları yalnız yöneticiye açık'; end if;
  select coalesce(array_agg(distinct x), '{}') into n
    from (select upper(regexp_replace(k, '[^A-Za-z0-9]', '', 'g')) x from unnest(coalesce(p_kodlar, '{}')) k) s where length(x) >= 4;
  n := n[1:60];
  return query
  select 'kart'::text, m.tedarikci, m.urun_id, m.kod, null::text, m.ad, null::text, m.fiyat, null::numeric, m.stok_var, m.zaman, 'kart'::text
    from tedarikci_maliyet m
   where m.urun_id = any(coalesce(p_urunler, '{}')) and m.fiyat > 0
  union all
  select 'katalog'::text, c.tedarikci, null::uuid, c.kod, c.marka, c.ad, c.oem, c.fiyat, c.stok, c.stok > 0, c.zaman,
         case when c.kod_norm = any(n)
                or upper(regexp_replace(regexp_replace(c.kod, '^[A-Za-zÇĞİÖŞÜçğıöşü]{2,6}-', ''), '[^A-Za-z0-9]', '', 'g')) = any(n) then 'kod' else 'oem' end
    from tedarikci_katalog c
   where c.fiyat > 0 and cardinality(n) > 0 and (
         c.kod_norm = any(n)
      or upper(regexp_replace(regexp_replace(c.kod, '^[A-Za-zÇĞİÖŞÜçğıöşü]{2,6}-', ''), '[^A-Za-z0-9]', '', 'g')) = any(n)
      or exists (select 1 from regexp_split_to_table(coalesce(c.oem, ''), '[\s,;]+') t where length(t) >= 4 and upper(regexp_replace(t, '[^A-Za-z0-9]', '', 'g')) = any(n)));
end $$;
revoke all on function public.tedarikci_fiyat_ara(text[], uuid[]) from public, anon;
grant execute on function public.tedarikci_fiyat_ara(text[], uuid[]) to authenticated;
