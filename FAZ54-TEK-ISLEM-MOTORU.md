# FAZ 54 — ERP Tek İşlem Motoru

Satış, alış, satış iadesi/iptali ve alış iadesi/iptali tek domain işlem modeli
altında birleştirildi.

## Tek çekirdek

`ERP İşlemi → Stok → Finans → Cari → KDV → Maliyet → Kâr`

## Desteklenen işlemler
- SATIS
- ALIS
- SATIS_IADE
- SATIS_IPTAL
- ALIS_IADE
- ALIS_IPTAL

## Temel kural
Aynı ticari işlem birden fazla bağımsız state güncellemesi gibi davranmamalıdır.
Gerçek transaction/RPC katmanında tek atomik commit hedeflenir.

## Güvenlik
- idempotencyKey zorunlu
- kaynak işlem iade/iptalde zorunlu
- miktar/fiyat/maliyet pozitif
- gerçek server/RLS kontrolü ayrıca zorunlu

Production verisi değiştirilmedi.
