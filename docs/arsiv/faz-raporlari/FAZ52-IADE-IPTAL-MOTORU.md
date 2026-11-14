# FAZ 52 — İade / İptal Motoru

Satış ve alış işlemlerinin ters kayıtları merkezi motorda modellendi.

## Satış iade/iptal
`Satış → Ters İşlem`

- Stok geri gelir
- Kasa/banka tahsilatı tersine döner
- Cari alacak/borç tersine çevrilir
- KDV tersine çevrilir
- Maliyet geri alınır
- Brüt kâr geri alınır

## Alış iade/iptal
- Stok geri çıkar
- Kasa/banka ödemesi tersine döner
- Tedarikçi cari tersine çevrilir
- KDV tersine çevrilir
- Maliyet geri alınır

## Kısmi iade
`kalemler` yalnızca iade edilen miktarı taşıyabilir.

## Güvenlik
- Kaynak işlem zorunlu
- Idempotency key zorunlu
- Aynı kaynak işlem için mükerrer ters işlem database seviyesinde ayrıca engellenmelidir.
- Gerçek transaction/RPC zinciri tüm ters hareketleri atomik uygulamalıdır.

Production verisi değiştirilmedi.
