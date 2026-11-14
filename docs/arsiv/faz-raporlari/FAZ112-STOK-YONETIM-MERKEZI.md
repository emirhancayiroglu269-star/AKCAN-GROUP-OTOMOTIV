# FAZ 112 — Stok Yönetim Merkezi

Alış ve satıştan gelen stok hareketleri tek merkezde modellenir.

## Stok kartı
- Ürün / stok kodu
- Barkod
- OEM kodları
- Kritik stok seviyesi
- Minimum stok

## Depo / raf
- Depo
- Raf
- Mevcut stok
- Rezerve stok
- Kullanılabilir stok

## Hareketler
- Alış
- Satış
- İade
- Transfer
- Sayım

## Kontroller
- Kullanılabilir stok = mevcut - rezerve
- Kritik stok uyarısı
- Stok değerleme
- Hareket idempotency anahtarı

Production verisi değiştirilmedi.
