# FAZ 55 — Müşteri / Tedarikçi Cari Motoru

Cari sistemi tek standartta modellendi.

## Cari tipleri
- Müşteri
- Tedarikçi

## Hareketler
- Satış
- Alış
- Tahsilat
- Ödeme
- İade
- İptal
- Düzeltme

## Bağlantı
Her cari hareketi:
`Cari → Kaynak İşlem → Finans → Stok`

zincirinin parçasıdır.

## Kurallar
- Cari kimliği zorunlu
- Kaynak işlem zorunlu
- Idempotency key zorunlu
- Tutar pozitif olmalı
- Bakiye hareketlerden türetilmeli

## İş mantığı
Müşteri açık hesap satışında müşterinin borcu artar.
Müşteri tahsilatında borcu azalır.

Tedarikçi açık hesap alışında tedarikçiye borç artar.
Tedarikçi ödemesinde borç azalır.

Production verisi değiştirilmedi.
