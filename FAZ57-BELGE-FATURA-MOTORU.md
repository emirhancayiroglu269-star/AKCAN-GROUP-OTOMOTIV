# FAZ 57 — Belge / Fatura Motoru

ERP işlemlerinin resmi ticari belge omurgası oluşturuldu.

## Belge tipleri
- Satış faturası
- Alış faturası
- Satış iadesi
- Alış iadesi
- Satış iptali
- Alış iptali

## Belge yaşam döngüsü
`TASLAK → ONAYLI → IPTAL`

Taslak belge finansal hareket oluşturmamalı.
ONAYLI belge tek işlem motorunu tetiklemeli.
IPTAL, kaynak belgeye bağlı ters işlem üretmeli.

## Belge bağlantıları
Belge:
- müşteri/tedarikçi,
- kalemler,
- KDV,
- toplam,
- ödeme yöntemi,
- kaynak belge,
- idempotency key

ile ana işlem zincirine bağlanır.

## Önemli
Bu faz elektronik fatura/e-Arşiv entegrasyonu değildir. Ücretli dış servis eklenmedi.
Production verisi değiştirilmedi.
