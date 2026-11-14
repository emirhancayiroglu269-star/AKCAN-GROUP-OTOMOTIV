# FAZ 50 — Satış Tek Zincir

Satış işlemi tek ticari zincir olarak modellendi:

`Satış → Stok Çıkışı → Kasa/Cari → KDV → Maliyet → Brüt Kâr`

## Ödeme
- Nakit/POS/Havale → kasa/hesap tahsilatı
- Açık hesap → cari borç

## Stok
Satış kalemlerinin toplam adedi kadar stok çıkışı oluşturulmalıdır.

## Finans
Satış toplamı:
- tahsil edilmişse kasa/hesap,
- açık hesapsa cari
üzerinden izlenir.

## Kâr
`Brüt Kâr = Satış Tutarı - Maliyet`

## Güvenlik
İşlem `idempotencyKey` ile tekilleştirilir.
Gerçek database transaction'ı server/RPC katmanında aynı zinciri atomik olarak
uygulamalıdır.

Production verisi değiştirilmedi.
