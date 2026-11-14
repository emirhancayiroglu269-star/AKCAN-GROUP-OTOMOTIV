# FAZ 60 — Ürün / Stok Kartı Motoru

ERP'nin merkezi ürün kartı oluşturuldu.

## Kart bilgileri
- Stok kodu
- Barkod
- Marka
- Kategori
- Ürün adı
- OEM kodları
- Alternatif kodlar
- Birim
- KDV
- Alış maliyeti
- Satış fiyatı
- Minimum stok
- Maksimum stok
- Mevcut stok
- Raf adresi
- Depo
- Aktif/pasif
- Notlar

## Stok uyarısı
- Mevcut <= minimum → KRİTİK
- Minimum < mevcut < maksimum → NORMAL
- Mevcut >= maksimum → FAZLA

## Arama
Stok kodu, barkod, marka, kategori, ürün adı, OEM ve alternatif kodlardan
tek arama metni oluşturulabilir.

Gerçek stok miktarı V49 stok hareket motorundan türetilmelidir; ürün kartındaki
`mevcutStok` alanı cache/özet olarak ele alınmalıdır.

Production verisi değiştirilmedi.
