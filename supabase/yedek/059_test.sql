create temp table tst (ad text, deger text);
grant all on tst to authenticated;
-- ===== KASİYER =====
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","email":"akcangroupotomotiv@gmail.com","sub":"00000000-0000-0000-0000-0000000000a2"}';
insert into tst select 'k_rol', benim_rolum();
insert into tst select 'k_urunler_ana', count(*)::text from urunler;
insert into tst select 'k_urunler_p', count(*)::text from urunler_p;
insert into tst select 'k_urunler_p_alis_dolu', count(*)::text from urunler_p where alis_fiyati is not null;
insert into tst select 'k_hareketler_ana', count(*)::text from hareketler;
insert into tst select 'k_hareketler_p', count(*)::text from hareketler_p;
insert into tst select 'k_rapor_p', count(*)::text from rapor_satirlari_p;
insert into tst select 'k_rapor_p_alis_tutar_dolu', count(*)::text from rapor_satirlari_p where (tur='alis' and (net is not null or toplam is not null)) or alis_fiyati is not null;
insert into tst select 'k_rapor_ana', count(*)::text from rapor_satirlari;
insert into tst select 'k_kasa_akisi', count(*)::text from kasa_akisi;
insert into tst select 'k_hesap_bakiyeleri', count(*)::text from hesap_bakiyeleri;
insert into tst select 'k_masraflar', count(*)::text from masraflar;
insert into tst select 'k_cariler_ana', count(*)::text from cariler;
insert into tst select 'k_cariler_p', count(*)::text from cariler_p;
insert into tst select 'k_cariler_p_bakiye_dolu', count(*)::text from cariler_p where bakiye is not null;
insert into tst select 'k_tahsilat_notlari', count(*)::text from tahsilat_notlari;
insert into tst select 'k_depolar', count(*)::text from depolar;
insert into tst select 'k_urun_depo_stok', count(*)::text from urun_depo_stok;
insert into tst select 'k_urun_kodlari', count(*)::text from urun_kodlari;
insert into tst select 'k_ayarlar', count(*)::text from ayarlar;
insert into tst select 'k_stok_aksiyon', count(*)::text from stok_aksiyon;
insert into tst select 'k_tedarikci_maliyet', count(*)::text from tedarikci_maliyet;
insert into tst select 'k_denetim', count(*)::text from denetim;
do $$ declare n int; begin
  update urunler set raf = raf where true; get diagnostics n = row_count; insert into tst values ('k_urunler_guncelle_satir', n::text);
  update ayarlar set firma_adi = firma_adi where true; get diagnostics n = row_count; insert into tst values ('k_ayarlar_guncelle_satir', n::text);
  update urun_kodlari set kod = kod where true; get diagnostics n = row_count; insert into tst values ('k_urun_kodlari_guncelle_satir', n::text);
  begin insert into urunler (ad) values ('TEST'); insert into tst values ('k_urun_ekle', 'EKLEDI!'); exception when others then insert into tst values ('k_urun_ekle', 'engellendi: ' || sqlstate); end;
  begin insert into kasa_akisi (tarih, tip) values (current_date, 'x'); insert into tst values ('k_kasa_ekle', 'EKLEDI!'); exception when others then insert into tst values ('k_kasa_ekle', 'engellendi: ' || sqlstate); end;
  begin insert into sorulan (metin, kullanici, adet) values ('TEST-059', 'test', 1); insert into tst values ('k_sorulan_ekle', 'eklendi (beklenen)'); exception when others then insert into tst values ('k_sorulan_ekle', 'HATA ' || sqlerrm); end;
  begin insert into denetim (tablo, islem) values ('x','y'); insert into tst values ('k_denetim_ekle', 'EKLEDI!'); exception when others then insert into tst values ('k_denetim_ekle', 'engellendi: ' || sqlstate); end;
end $$;
insert into tst select 'k_denetim_sorulan_kaydi', count(*)::text from denetim;  -- kasiyer denetimi göremez: 0 beklenir
-- ===== YÖNETİCİ =====
set local request.jwt.claims = '{"role":"authenticated","email":"emirhancayiroglu269@gmail.com","sub":"00000000-0000-0000-0000-0000000000a1"}';
insert into tst select 'y_rol', benim_rolum();
insert into tst select 'y_urunler', count(*)::text from urunler;
insert into tst select 'y_urunler_alis_dolu', count(*)::text from urunler where alis_fiyati > 0;
insert into tst select 'y_rapor', count(*)::text from rapor_satirlari;
insert into tst select 'y_kasa_akisi', count(*)::text from kasa_akisi;
insert into tst select 'y_cariler', count(*)::text from cariler;
insert into tst select 'y_tedarikci_maliyet', count(*)::text from tedarikci_maliyet;
insert into tst select 'y_denetim_kasiyer_sorulan', string_agg(eposta || ' ' || rol || ' ' || tablo || ' ' || islem || ' ' || coalesce(yeni->>'metin',''), '; ') from denetim;
do $$ declare n int; begin
  update urunler set raf = 'TEST-RAF' where id = (select id from urunler order by id limit 1); get diagnostics n = row_count; insert into tst values ('y_urun_guncelle_satir', n::text);
end $$;
insert into tst select 'y_denetim_urun_degisiklik', string_agg(tablo || ' ' || islem || ' eski=' || eski::text || ' yeni=' || yeni::text, '; ') from denetim where tablo = 'urunler';
-- ===== ANON =====
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;
do $$ begin
  begin perform count(*) from urunler; insert into tst values ('a_urunler', 'OKUDU!'); exception when others then insert into tst values ('a_urunler', 'engellendi: ' || sqlstate); end;
  begin perform count(*) from urunler_p; insert into tst values ('a_urunler_p', 'OKUDU!'); exception when others then insert into tst values ('a_urunler_p', 'engellendi: ' || sqlstate); end;
end $$;
reset role;
do $$ begin raise exception 'TEST_SONUCU %', (select json_agg(json_build_array(ad, deger)) from tst); end $$;
