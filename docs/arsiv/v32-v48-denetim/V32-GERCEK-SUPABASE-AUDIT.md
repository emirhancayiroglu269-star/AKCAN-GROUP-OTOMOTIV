# FAZ 32 — Gerçek Supabase Schema + RLS Audit

## Canlı proje doğrulaması

Supabase projesinin gerçek public şeması okundu.

### Tablolar

- `public.app_state`
  - RLS: AÇIK
  - Primary key: `id`
  - Ana veri: `data jsonb`
  - Versiyon: `version`
  - Son güncelleyen: `updated_by`

- `public.app_sessions`
  - RLS: AÇIK
  - Primary key: `token_hash`
  - `user_id`, `expires_at`, `created_at`

- `public.app_state_backups`
  - RLS: AÇIK
  - Backup JSONB veri yapısı

- `public.audit_logs`
  - RLS: AÇIK
  - Denetim kayıtları

- `public.role_permissions`
  - RLS: AÇIK
  - Rol + JSONB yetki listesi

- `public.app_events`
  - RLS: AÇIK
  - Realtime/event sürüm kayıtları

### RLS policy bulgusu

Doğrudan policy bulunan tablolar:
- `app_sessions` → doğrudan erişim reddi
- `app_state` → doğrudan erişim reddi
- `app_state_backups` → doğrudan erişim reddi

Diğer RLS açık tablolarda doğrudan policy görünmüyor. Bu, `anon/authenticated` için varsayılan RLS reddi anlamına gelebilir; ancak uygulamanın RPC/server akışı ayrıca değerlendirilmelidir.

### Security Definer fonksiyonları

Canlı projede şu `SECURITY DEFINER` fonksiyonları bulundu:
- `write_app_state`
- `log_app_state_update`
- `notify_app_state_changed`
- `rls_auto_enable`

`write_app_state` `app_state` üzerinde kontrollü bir güncelleme yapıyor.
Fonksiyon için `anon` ve `authenticated` rollerinde doğrudan EXECUTE yetkisi görünmedi.

### Kritik sonuç

Mevcut gerçek mimari klasik "her modül ayrı SQL tablosu" modelinden farklı görünüyor.
ERP verisinin önemli bölümü `app_state.data` JSONB içinde tutuluyor ve uygulama tarafındaki merkezi API/RPC akışı üzerinden yönetiliyor.

Bu nedenle V30'da tasarlanan kör tablo-RLS yaklaşımı doğrudan uygulanmamalı.

### Sonraki doğru aşama

1. `app_state` yazma akışının server/API tarafını incele.
2. Kimlerin `write_app_state` çağırabildiğini doğrula.
3. Kullanıcı/rol bilgisinin nasıl doğrulandığını çıkar.
4. `role_permissions` tablosunun gerçek kullanımını doğrula.
5. `audit_logs` ve `app_events` yazma akışını kontrol et.
6. Merkezi JSONB veri modelinde modül bazlı yetki sınırlarını doğrula.

Bu audit sırasında production verisi değiştirilmedi.
