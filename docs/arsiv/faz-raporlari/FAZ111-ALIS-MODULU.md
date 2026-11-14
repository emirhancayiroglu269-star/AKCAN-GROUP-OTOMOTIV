# FAZ 111 — Alış Modülü

Satış modülünün karşı zinciri oluşturuldu.

## Akış
Tedarikçi → Alış faturası → Ürünler → Stok artışı → Cari borç → Kasa/Banka → Belge → Audit

## Özellikler
- Tedarikçi seçimi
- Fatura numarası
- Ürün/OEM/barkod üzerinden alış satırı
- Miktar
- Birim maliyet
- İskonto
- KDV
- Nakit / Kart / Havale / Açık Hesap
- Stok maliyeti
- Tedarikçi borcu

Açık hesap alışta tedarikçi zorunludur.
Alış kaydı da satış gibi idempotent transaction ile uygulanmalıdır.

Production verisi değiştirilmedi.
