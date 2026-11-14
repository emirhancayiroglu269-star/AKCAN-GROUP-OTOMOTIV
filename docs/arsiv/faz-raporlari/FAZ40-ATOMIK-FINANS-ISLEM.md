# FAZ 40 — Atomik Finans İşlemi / Idempotency

Kritik finans işlemlerinin tek işlem mantığında korunması için çekirdek sözleşme hazırlandı.

## Kapsam
- Stok
- Kasa
- Cari
- KDV
- Maliyet
- Brüt kâr

## Idempotency
Her kritik işlem için benzersiz `idempotencyKey` zorunlu.

Aynı anahtar tekrar gelirse:
- ikinci kez finans hareketi uygulanmamalı,
- ilk işlem sonucu tekrar döndürülmeli.

## Önemli
Bu dosya transaction sözleşmesidir. Gerçek Supabase transaction/atomic commit için server/RPC tarafında uygulanmalıdır.
Production verisi değiştirilmedi.
