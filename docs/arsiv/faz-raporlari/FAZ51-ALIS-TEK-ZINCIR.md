# FAZ 51 — Alış Tek Zincir

Alış işlemi satış motoruyla aynı standartta kuruldu:

`ALIŞ → STOK GİRİŞİ → TEDARİKÇİ CARİ → KASA/BANKA → KDV → MALİYET`

## Ödeme
- Nakit/Havale → kasa veya hesap azalır.
- Açık hesap → tedarikçi cari borcu oluşur.

## Stok
Alış miktarı kadar stok girişi yapılır.

## Maliyet
Alış tutarı stok maliyetine eklenir.

## Güvenlik
`idempotencyKey` ile çift alış engellenir.
Gerçek transaction/RPC katmanı tüm zinciri atomik olarak uygulamalıdır.

Production verisi değiştirilmedi.
