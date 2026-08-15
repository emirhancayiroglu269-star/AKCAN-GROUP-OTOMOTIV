# V47 — Ücretsiz ERP Mimari Anayasası

## Ana hedef
AKCAN GROUP ERP'nin mümkün olduğunca sıfır ek maliyetle çalışması.

## Maliyet kilidi
Yeni bir özellik için aşağıdakilerden biri gerekiyorsa doğrudan kullanılmayacak:
- ücretli Supabase branch/proje
- ücretli API
- ücretli SaaS
- ücretli SMS
- ücretli e-posta servisi
- ücretli lisans
- zorunlu kredi/bakiye
- kullanım başına ücretli üçüncü taraf servis

Önce mevcut altyapı veya ücretsiz açık kaynak alternatif değerlendirilecek.

## Altyapı
- Mevcut Supabase projesi korunacak.
- Yeni Supabase branch oluşturulmayacak.
- Yeni production projesi oluşturulmayacak.
- Testler mümkün olduğunca lokal/mok veri ile yapılacak.
- Gerçek production verisine test yazımı yapılmayacak.
- Frontend mevcut React yapısı üzerinden devam edecek.

## Veri mimarisi
Mevcut `app_state` / JSONB yapısı korunacak.
Gereksiz migration ve tablo çoğalması yapılmayacak.

## Güvenlik
- Supabase Auth
- RLS
- Rol/yetki guard
- Idempotency
- Optimistic locking
- Audit log

ücretsiz mevcut altyapı sınırları içinde tutulacak.

## ERP kapsamı
Satış, alış, stok, cari, kasa, banka, POS, iade/iptal, raporlar,
kullanıcı/rol ve yönetici paneli.

## Tasarım ilkesi
Önce çalışan çekirdek ERP.
Sonra optimizasyon.
Sonra entegrasyon.
Ücretli servis zorunluluğu oluşturacak entegrasyonlar en sona bırakılır.
