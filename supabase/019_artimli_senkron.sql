-- 2026-10-20: artımlı senkron (site yalnız değişen satırları çeker; Supabase ücretsiz plan 5 GB/ay veri çıkışı)
-- Canlı veritabanına "artimli_senkron" migrasyonu olarak uygulandı. Özet:
--  * degisim_isaretle(): her izlenen tabloda "degisim" sütunu ekleme ve gerçek değişiklikte güncellenir (yalnız bh_guncelleme değişirse değil)
--  * silinen tablosu + silineni_kaydet(): silinen kayıtların anahtarı (site önbelleğinden düşürmek için), 7 günden eskisi her gece temizlenir
--  * izlenen tablolar: urunler, urun_depo_stok, rapor_satirlari, kasa_akisi, masraflar, urun_kodlari, otomarmara_veri, fiyat_gecmisi, hareketler
create or replace function public.degisim_isaretle() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'degisim' - 'bh_guncelleme' - 'etiket') = (to_jsonb(old) - 'degisim' - 'bh_guncelleme' - 'etiket') then
    new.degisim := old.degisim; return new;
  end if;
  new.degisim := clock_timestamp(); return new;
end $$;
create table if not exists public.silinen (id bigserial primary key, tablo text not null, kayit text not null, zaman timestamptz not null default clock_timestamp());
create index if not exists silinen_zaman_idx on public.silinen (zaman);
alter table public.silinen enable row level security;
-- policy: giris_yapan_okur (select, authenticated, benim_rolum() <> 'yok')
create or replace function public.silineni_kaydet() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into silinen (tablo, kayit) values (tg_table_name, (to_jsonb(old) ->> tg_argv[0]) || coalesce('|' || (to_jsonb(old) ->> tg_argv[1]), ''));
  return old;
end $$;
-- her tablo için: degisim sütunu + dizin + degisim_tg (before insert/update) + silinen_tg (after delete)
-- cron: silinen-temizlik '17 3 * * *'
