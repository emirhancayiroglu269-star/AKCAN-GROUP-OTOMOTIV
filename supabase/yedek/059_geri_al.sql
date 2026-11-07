-- 059_faz0_yetki_denetim.sql GERİ ALMA — 07.11.2026 öncesi izin durumuna döner.
-- Kaynak: 07.11.2026 14:40'ta canlı veritabanından alınan pg_policies ve tablo izinleri anlık görüntüsü.
-- Veri silmez. denetim ve yedek_kayit tablolarını (içindeki kayıtlarla) bırakır, yalnız tetikleyicileri kaldırır.
begin;
-- rol fonksiyonu (eski hali)
create or replace function public.benim_rolum() returns text language sql stable security definer set search_path to 'public' as $$
  select case
    when not exists (select 1 from kullanicilar) then 'yonetici'
    else coalesce((select rol from kullanicilar where lower(eposta) = lower(auth.jwt() ->> 'email') and aktif limit 1), 'yok')
  end
$$;
-- denetim tetikleyicileri
do $$ declare t text; begin
  foreach t in array array['urunler','urun_kodlari','kullanicilar','ayarlar','hareketler','depolar','cariler','tahsilat_notlari','stok_aksiyon',
      'fiyat_teklifleri','sorulan','sayim','odeal_fatura','tedarikci_carpan','asistan_oneri','asistan_hafiza','sase_araclar','rakip_not','otomarmara_veri'] loop
    execute format('drop trigger if exists denetim_tg on public.%I', t);
  end loop; end $$;
select cron.unschedule('yedek-kontrol') where exists (select 1 from cron.job where jobname = 'yedek-kontrol');
-- görünümler
drop view if exists public.urunler_p, public.hareketler_p, public.rapor_satirlari_p, public.fiyat_gecmisi_p, public.cariler_p;
-- izinler (Supabase varsayılanı: anon ve authenticated tüm tablolarda; erişimi RLS politikaları belirler)
grant all on all tables in schema public to anon, authenticated;
grant execute on function public.silineni_kaydet(), public.tedarikci_maliyet_carpan(), public.tedarikci_maliyet_carpan_ekle() to anon, authenticated;
-- politikalar: 059'un değiştirdiği tablolarda önce yeni politikalar silinir, sonra eskiler kurulur
do $$ declare t text; p record; begin
  foreach t in array array['urunler','hareketler','rapor_satirlari','fiyat_gecmisi','cariler','cari_hareketler','kasa_akisi','masraflar',
      'hesap_bakiyeleri','vadesi_gecen','tahsilat_notlari','tedarikci_carpan','bh_kuyruk','ty_durum','ty_gonderim','ty_kategori_esleme','ty_marka_esleme',
      'ty_onbellek','ty_oto_atla','ty_siparis','ty_urun','ty_yukleme','satislar','kasalar','kasa_hareketleri','musteriler','servisler','teklifler',
      'stok_hareketleri','gun_sonu','cari_hareketleri','araclar','ayarlar','bh_durum','depolar','urun_depo_stok','urun_kodlari','otomarmara_veri',
      'sorulan','fiyat_teklifleri','sayim','stok_aksiyon','sase_araclar','rakip_not'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop execute format('drop policy %I on public.%I', p.policyname, t); end loop;
  end loop; end $$;
create policy giris_yapan_okur on public.hesap_bakiyeleri as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
create policy giris_yapan_okur on public.kasa_akisi as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
create policy giris_yapan_okur on public.masraflar as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
create policy giris_yapan_okur on public.rapor_satirlari as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
create policy giris_yapan_okur on public.vadesi_gecen as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
do $$ declare t text; begin
  foreach t in array array['araclar','ayarlar','bh_durum','bh_kuyruk','cari_hareketler','cari_hareketleri','cariler','depolar','fiyat_gecmisi','fiyat_teklifleri',
      'gun_sonu','hareketler','kasa_hareketleri','kasalar','musteriler','otomarmara_veri','sase_araclar','satislar','sayim','servisler','sorulan','stok_aksiyon',
      'stok_hareketleri','tahsilat_notlari','teklifler','urun_depo_stok','urun_kodlari','urunler'] loop
    execute format('create policy giris_yapan_tam_yetki on public.%I as PERMISSIVE for ALL to authenticated using ((benim_rolum() <> ''yok''::text)) with check ((benim_rolum() <> ''yok''::text))', t);
  end loop;
  foreach t in array array['ty_durum','ty_gonderim','ty_kategori_esleme','ty_marka_esleme','ty_oto_atla','ty_siparis','ty_urun','ty_yukleme'] loop
    execute format('create policy okuma on public.%I as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> ''yok''::text))', t);
  end loop; end $$;
create policy guncelleme on public.rakip_not as PERMISSIVE for UPDATE to authenticated using ((benim_rolum() <> 'yok'::text)) with check ((benim_rolum() <> 'yok'::text));
create policy okuma on public.rakip_not as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
create policy yazma on public.rakip_not as PERMISSIVE for INSERT to authenticated with check ((benim_rolum() <> 'yok'::text));
create policy supheli_okuma on public.ty_onbellek as PERMISSIVE for SELECT to authenticated using (((anahtar = 'fiyat_supheli'::text) AND (benim_rolum() <> 'yok'::text)));
create policy tedarikci_carpan_okuma on public.tedarikci_carpan as PERMISSIVE for SELECT to authenticated using ((benim_rolum() <> 'yok'::text));
create policy tedarikci_carpan_yaz on public.tedarikci_carpan as PERMISSIVE for ALL to authenticated using ((benim_rolum() = 'yonetici'::text)) with check ((benim_rolum() = 'yonetici'::text));
commit;
