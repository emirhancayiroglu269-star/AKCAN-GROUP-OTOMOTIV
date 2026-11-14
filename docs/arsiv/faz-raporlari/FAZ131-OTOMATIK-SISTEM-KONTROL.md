# FAZ 131 — Otomatik Sistem Kontrol & Yönetici Uyarı Merkezi

V130 teknik izleme katmanının üzerine otomatik kontrol ve yönetici uyarı
akışı eklendi.

## Akış
Otomatik kontrol → Sorun tespiti → Seviye belirleme → Yönetici uyarısı →
Audit referansı → Sorun çözülünce durum güncelleme

## Kontroller
- Sunucu
- Veritabanı
- API
- Supabase
- İnternet
- Oturumlar
- Entegrasyonlar
- Yedekleme

## Seviyeler
- Uyarı
- Kritik

HATA sonucu da kritik yönetici uyarısı üretir.

## Tekrarlı uyarı kontrolü
Bileşen + referans ID ile idempotency anahtarı kullanılır.

Production verisi değiştirilmedi.
