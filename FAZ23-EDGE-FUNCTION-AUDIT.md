# FAZ 23 — Edge Function Audit

Mevcut kaynakta Edge/Supabase çağrıları tarandı.

Bu aşamada gerçek Edge Function endpoint'lerine istek gönderilmedi.
Amaç üretim verisine dokunmadan kontrat ve güvenlik noktalarını belirlemek.

## Denetim
- HTTP handler / `serve()`
- `supabase.functions.invoke`
- `createClient`
- `service_role` kullanımı
- `dryRun` desteği

Ayrıca ortak `edge-guvenlik-guard.ts` eklendi:
- testRunId zorunlu
- dryRun=true zorunlu
- dryRun modunda commit açıkça yasak

## Kritik not
Gerçek Edge Function'ın production commit davranışını kesin doğrulamak için izole Supabase test ortamı veya ayrı test projesi gerekir.
