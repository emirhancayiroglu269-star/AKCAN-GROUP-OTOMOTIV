# FAZ 22 — Edge Function Test Sözleşmesi

Gerçek Supabase/Edge Function testine geçmeden önce güvenli bir test sözleşmesi oluşturuldu.

## Güvenlik kuralları
- Her testin benzersiz `testRunId` değeri olmalı.
- Referans ID test verisi olmalı.
- `dryRun: true` zorunlu.
- Response içinde `committed: false` bekleniyor.
- Test işlemleri üretim finans kayıtlarına commit etmemeli.

## Operasyonlar
- satış
- alış
- iade
- iptal

Bu aşama gerçek Edge Function çağrısı yapmaz. Gerçek çağrı için ilgili Edge Function endpoint/kontratının doğrulanması gerekir.
