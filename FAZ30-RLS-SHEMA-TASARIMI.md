# FAZ 30 — Supabase RLS Şema Tasarımı

Bu aşamada production'a uygulanmayan bir RLS başlangıç şablonu hazırlandı.

## Rol matrisi
- admin: tam yönetim
- yonetici: yönetim + rapor/operasyon
- satis: satış ve sınırlı müşteri/stok erişimi
- depo: stok ve alış operasyonları
- muhasebe: kasa, banka, cari, rapor
- servis: servis/stok görüntüleme
- salt-okuma: yalnız görüntüleme

## Hazırlanan
- `user_profiles`
- `current_user_role()`
- `has_role()`
- profil RLS policy örnekleri

## Kritik uyarı
Mevcut ZIP'te gerçek Supabase tablo şeması/policy tanımı olmadığı için satış, stok, kasa, banka, cari vb. tablolara körlemesine policy yazılmadı.

Bu SQL migration production Supabase'e henüz uygulanmamıştır.
Önce gerçek tablo/kolon yapısı doğrulanmalıdır.
