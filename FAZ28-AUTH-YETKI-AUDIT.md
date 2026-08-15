# FAZ 28 — Auth / Yetki Güvenlik Zinciri

Kaynak kodda Auth ve rol/yetki sinyalleri statik olarak tarandı.

Ortak yetki modeli eklendi:
- admin
- yönetici
- satış
- depo
- muhasebe
- servis
- salt-okuma

Yetkiler işlem bazında tanımlandı:
`satis`, `alis`, `stok`, `kasa`, `banka`, `cari`, `rapor`, `ayarlar`, `iade`, `iptal`.

## Kritik güvenlik ilkesi
UI'da buton gizlemek güvenlik değildir. Gerçek yetki kontrolü Supabase/RLS veya güvenilir server katmanında da uygulanmalıdır.

Production Auth çağrısı yapılmadı.
