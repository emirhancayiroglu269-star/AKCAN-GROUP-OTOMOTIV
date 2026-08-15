# FAZ 49 — Stok Motoru

ERP'nin stok hareketleri merkezi bir domain motoruna alındı.

## Hareket tipleri
- ALIS
- SATIS
- IADE
- IPTAL
- SAYIM_GIRIS
- SAYIM_CIKIS
- TRANSFER_CIKIS
- TRANSFER_GIRIS
- DUZELTME

## Kurallar
- Miktar 0 veya negatif olamaz.
- Her kritik hareket `idempotencyKey` taşımalıdır.
- Aynı idempotency key ikinci kez stok hareketi oluşturmamalıdır.
- Negatif stok varsayılan olarak engellidir.
- Transfer çıkış/giriş ayrı hareketlerdir.
- İade/iptal ters hareket mantığıyla işlenir.

## Tasarım
Stok bakiyesi doğrudan rastgele değiştirilmek yerine hareketlerden türetilir.

Bu fazda production stok verisi değiştirilmedi.
