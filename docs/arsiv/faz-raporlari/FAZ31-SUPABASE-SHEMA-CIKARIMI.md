# FAZ 31 — Supabase Gerçek Şema Çıkarımı

Mevcut proje ZIP'i statik olarak incelendi.

## Sonuç
Bu paket içinde gerçek Supabase database şemasını kesin olarak doğrulayacak
`CREATE TABLE` / gerçek migration seti bulunmuyorsa, tablo ve kolonlar tahmin
edilerek RLS yazılmayacaktır.

Kaynak kodda görülen tablo referansları ayrıca raporlanır.

## Güvenlik
- Production Supabase bağlantısı yapılmadı.
- Tablo oluşturma/değiştirme yapılmadı.
- RLS uygulanmadı.
- Kullanıcı/veri silinmedi.

## Sonraki doğru adım
Eğer Supabase projesi bağlıysa gerçek schema metadata üzerinden tablolar,
kolonlar, primary key, foreign key, RLS ve policy durumları okunmalı; ardından
V32'de gerçek şemaya göre migration hazırlanmalıdır.
