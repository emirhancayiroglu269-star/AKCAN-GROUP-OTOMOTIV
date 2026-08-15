# FAZ 63 — POS / Kasa Satış Motoru

Hızlı satış ekranı artık gerçek satış akışına hazırlanmıştır.

## Akış

`Ürün → Sepet → İskonto → KDV → Toplam → Ödeme → Belge → Tek İşlem Motoru`

## Ödeme tipleri

- Nakit → Kasa
- POS → POS hesabı
- Havale → Banka
- Açık hesap → Cari

## Kurallar

- Sepet boş olamaz.
- Idempotency key zorunlu.
- Açık hesapta cari zorunlu.
- Miktar pozitif tam sayı olmalı.
- İskonto %0-100 arası olmalı.
- Finans/stok/cari gerçek yazımı V54/V53/V55/V56 zincirleri üzerinden yapılmalı.

## Önemli
POS ekranı hesaplama yapar; doğrudan database'e parça parça yazmamalıdır.
Tek commit, tek işlem kimliği ve mutabakat kontrolü kullanılmalıdır.

Production verisi değiştirilmedi.
