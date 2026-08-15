# FAZ 41 — Gerçek write_app_state Transaction Audit

Canlı Supabase fonksiyonu okunarak kontrol edildi.

## Gerçek fonksiyon
`public.write_app_state(jsonb, text)`

Fonksiyon:
- `app_state.data` değerini tamamen değiştiriyor.
- `updated_at = now()`
- `updated_by = p_updated_by`
- `version = version + 1`

## Kritik bulgu

Mevcut fonksiyonun parametrelerinde:
- `idempotencyKey` yok.
- `expectedVersion` / optimistic locking yok.
- duplicate işlem kontrolü yok.

Dolayısıyla V40'ta hazırlanan idempotency sözleşmesi henüz canlı `write_app_state` fonksiyonuna uygulanmış değil.

## Güvenlik

Canlı kontrolde `anon` ve `authenticated` rollerinin `write_app_state` için EXECUTE yetkisi olmadığı doğrulandı.

Bu iyi bir bulgu; ancak uygulamanın yazma işlemini hangi güvenilir server/service rolü üzerinden yaptığını ayrıca doğrulamak gerekir.

## V41 sonucu

Production fonksiyonunu bu aşamada değiştirmedim.

Hazırlanan yeni kontrat:
- `idempotencyKey`
- `expectedVersion`
- `updatedBy`
- `dryRun`

alanlarını zorunlu hale getiriyor.

## Önerilen gerçek transaction

`expectedVersion` eşleşmeden update yapılmamalı.

Aynı `idempotencyKey` daha önce işlendi ise ikinci finansal değişiklik uygulanmamalı.

Bu iki kontrol aynı transaction içinde yapılmalı.
