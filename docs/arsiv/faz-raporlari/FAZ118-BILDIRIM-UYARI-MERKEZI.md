# FAZ 118 — Bildirim & Uyarı Merkezi

Yönetici ve kullanıcıların önemli ERP olaylarını kaçırmaması için merkezi bildirim
modeli oluşturuldu.

## Uyarı türleri
- Kritik stok
- Vadesi gelen cari
- Geciken ödeme
- Bekleyen sipariş
- Düşük kâr marjı
- Başarısız işlem
- Sistem uyarısı

## Seviyeler
- Bilgi
- Uyarı
- Kritik

## Durum
Bildirimler okunmamış/okundu olarak takip edilir.
Kritik okunmamış bildirimler yönetici panelinde ayrıca gösterilebilir.

Aynı olay için referans + bildirim tipi ile idempotency anahtarı kullanılmalıdır.

Production verisi değiştirilmedi.
