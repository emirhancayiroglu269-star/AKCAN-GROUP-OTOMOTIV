# FAZ 45 — İzole RPC Test Hazırlığı

V44 test senaryoları gerçek PostgreSQL/Supabase RPC üzerinde çalıştırılabilecek
hale getirildi.

## Testler
- Normal write
- Idempotency duplicate
- Version conflict
- Eksik idempotency key
- Eksik updatedBy

## Güvenlik
Mevcut bağlı production Supabase projesine migration uygulanmadı.
Gerçek E2E için ayrı Supabase test projesi veya database branch kullanılmalıdır.

Bu paket production'a doğrudan uygulanmak üzere değil, test ortamı migration'ı
olarak hazırlanmıştır.
