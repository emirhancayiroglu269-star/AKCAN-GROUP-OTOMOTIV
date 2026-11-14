# FAZ 44 — Atomic RPC E2E Test Plan

V43 adapter sözleşmesi üzerine uçtan uca test senaryoları hazırlandı.

## Senaryolar

1. Normal yazma
   - Beklenen: commit
2. Aynı idempotency key ile tekrar
   - Beklenen: ikinci finansal yazma yapılmadan önceki sonuç döner
3. Eski expectedVersion
   - Beklenen: VERSION_CONFLICT
4. Eksik idempotency key
   - Beklenen: işlem reddedilir

## Canlı test durumu

Bu fazda production RPC çağrısı yapılmadı.
Testler kontrat/simülasyon seviyesindedir.

Gerçek E2E için izole Supabase test projesinde migration uygulanmalı ve
yukarıdaki dört senaryo gerçek RPC üzerinden çalıştırılmalıdır.
