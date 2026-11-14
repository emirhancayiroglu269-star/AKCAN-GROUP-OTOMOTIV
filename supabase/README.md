# Supabase dizini — migration durumu

> **Özet:** Migration'lar bugün **uygulanmıyor** ve uygulanmıyor olmaları bilinçli
> bir karar. Ayrıntılı gerekçe: [`docs/rls-dogrulama-raporu.md`](../docs/rls-dogrulama-raporu.md)

## `migrations/` — `supabase db push` ile uygulanacak dosyalar

Yalnızca **iki** dosya kaldı. İkisi de ya uygulanacak ya da açıkça ertelendi:

| Dosya | Durum | Ne yapar |
|---|---|---|
| `20260813_faz30_rls_baslangic.sql` | ⏸ **Bekliyor** | `user_profiles` + `current_user_role()` + `has_role()`. Gerçek şemayla eşleşmeden uygulanamaz. |
| `20260813_faz34_auth_profile.sql` | ❌ **Uygulanmayacak** | Tüm SQL yorum içinde; dosya başında karar notu var. |
| `20260813_faz42_atomic_write_app_state.sql` | ⏸ **Bekliyor** | `atomic_write_app_state` RPC + idempotency tablosu. Kodda çağrısı yok. |

## `tests/` — production'a GİRMEZ

| Dosya | Ne yapar |
|---|---|
| `tests/atomic_rpc_test.sql` | `atomic_write_app_state_test` RPC — yalnızca izole test projesinde çalıştırılır. |

**Neden `migrations/` altında değil:** `supabase db push` klasördeki *her* dosyayı
uygular. Test amaçlı bir migration orada durduğu sürece yanlışlıkla production'a
girebilirdi. `tests/` altına taşındı; oradan otomatik olarak hiçbir yere gitmiyor.

Çalıştırma (izole test projesinde, production'da değil):

```bash
psql "$TEST_DATABASE_URL" -f supabase/tests/atomic_rpc_test.sql
```

## Yeni migration eklerken

1. `supabase/migrations/YYYYMMDD_<ad>.sql` — tarih önekli, tek amaçlı.
2. Dosyanın başına **durum satırı** yaz: `-- DURUM: UYGULANACAK` veya
   `-- DURUM: ERTELENDİ — <sebep>`.
3. Uygulama bunu kullanmıyorsa **uygulama**. Kullanılmayan tablo/RLS güvenlik
   sağlamaz, saldırı yüzeyi büyütür.
4. Test amaçlı SQL `migrations/` altına **girmez** — `tests/` altına.
