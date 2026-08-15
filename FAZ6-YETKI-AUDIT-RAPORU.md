# V17 Faz 6 — Yetki + Audit Log

## Yapılanlar
- `src/lib/audit-log.ts` eklendi.
- Kritik işlem geçmişi için kategori, hedefId, islemId, sonuç ve hash-zinciri eklendi.
- Mevcut `islemKaydet()` çağrıları otomatik olarak `auditGecmisi` üretir; mevcut `islemGecmisi` korunur.
- `auditZincirKontrolu()` ile kayıt değişikliği ve zincir kopması tespit edilebilir.
- `kritikYetkiVarMi()` eklendi; kritik işlemlerde aktif kullanıcı yoksa izin vermez.
- Eski veriler için `auditGecmisi` geriye dönük uyumlu şekilde `veriyiOnar()` içine eklendi.

## Test
- 63 TS/TSX dosyası transpile: 0 hata.
- Audit zinciri oluşturma: PASS.
- Audit kaydında sonradan veri değiştirme tespiti: PASS.
- ZIP bütünlük kontrolü: PASS.

## Not
Audit hash'i parola güvenliği için değildir. Kayıt bütünlüğü/tamper detection içindir. Gerçek kimlik doğrulama ve yetki enforcement backend tarafında ayrıca korunmalıdır.
