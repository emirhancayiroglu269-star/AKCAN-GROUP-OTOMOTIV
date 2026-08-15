# FAZ 24 — Edge Function Güvenli Test Planı

Gerçek production çağrısı yapmadan Edge Function entegrasyonunu doğrulamak için test planı hazırlandı.

## Kurallar
- Production write yok.
- `dryRun=true`.
- Benzersiz `testRunId`.
- Test `referenceId`.
- Satış, alış, iade, iptal operasyonları ayrı test edilir.
- Idempotency anahtarı olmayan işlemler ayrıca kontrol edilir.

## Test grupları
EDGE-001..004: operasyon bazlı dry-run.
EDGE-005: idempotency zorunluluğu.
EDGE-006: test referansı zorunluluğu.

Bu aşama gerçek Edge Function çalıştırmaz; gerçek bağlantı için izole test projesi gerekir.
