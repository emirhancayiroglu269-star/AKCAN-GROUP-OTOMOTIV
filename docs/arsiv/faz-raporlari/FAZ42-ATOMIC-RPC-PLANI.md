# FAZ 42 — Atomic write_app_state RPC

Canlı migration geçmişi incelendi. Projede daha önce `atomic_app_state_versioning`
migration'ı bulunuyor; mevcut `write_app_state` ise hâlâ yalnızca
`p_data + p_updated_by` kabul ediyor.

Bu nedenle V42'de mevcut fonksiyonu kırmak yerine yeni:

`atomic_write_app_state(jsonb, text, text, bigint)`

RPC tasarlandı.

## Korunanlar
- Idempotency key
- Optimistic locking (`expectedVersion`)
- `app_state` row lock
- Version increment
- Updated by / timestamp
- Duplicate istekte ikinci yazmanın engellenmesi

## Güvenlik
Yeni RPC'nin `anon` ve `authenticated` EXECUTE yetkileri verilmemiştir.
Güvenilir server/service katmanı üzerinden kontrollü kullanım hedeflenir.

## Uygulama kararı
Bu V42 paketindeki SQL production'a uygulanmadı.
Önce mevcut uygulamanın RPC çağrı akışı V43'te yeni fonksiyona bağlanmalı,
ardından izole test ortamında transaction davranışı doğrulanmalıdır.
