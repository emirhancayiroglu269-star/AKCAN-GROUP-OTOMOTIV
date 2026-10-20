# Proje notları (Claude için)

## Supabase veritabanı
- 30 Ekim 2026'dan itibaren Supabase, public şemasında YENİ oluşturulan tablolara Data API erişimini otomatik vermiyor.
  Yeni tablo oluşturan her migrasyona açıkça izin satırları ekle (yoksa site "permission denied" alır):
  ```sql
  grant select, insert, update, delete on public.YENI_TABLO to authenticated;
  grant select, insert, update, delete on public.YENI_TABLO to service_role;
  -- anon'a yalnız gerçekten herkese açık olması gerekiyorsa (bu projede genelde gerekmez)
  ```
  Ayrıca RLS'i aç ve politika ekle (mevcut tablolar: `benim_rolum() <> 'yok'`).
- Büyük tablolar artımlı senkronda: yeni büyük tablo eklenirse `degisim` sütunu + `degisim_tg` / `silinen_tg` tetikleyicileri ve
  `src/lib/backend.ts` içindeki `IZLENEN` listesine ekle (bkz. supabase/019_artimli_senkron.sql).
- Veri çıkışı ücretsiz planda aylık 5 GB: siteye her yenilemede tüm tabloyu çektiren değişiklik yapma.
