# FAZ 26 — Supabase Statik Audit

Production veritabanına bağlanmadan kaynak kod tarandı.

Kontrol edilenler:
- Supabase client kullanımı
- `from()` tablo çağrıları
- RPC çağrıları
- Auth / Storage / Realtime ifadeleri
- Supabase bağlantılı dosyalar

Amaç: mevcut uygulamanın gerçekten hangi Supabase tablo/RPC sözleşmelerine dayandığını ortaya çıkarmak.

Bu aşamada hiçbir database yazma/silme/güncelleme işlemi yapılmadı.
