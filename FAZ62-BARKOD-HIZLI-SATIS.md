# FAZ 62 — Barkod / Ürün Arama / Hızlı Satış

Kasa ve satış ekranı için hızlı ürün bulma altyapısı oluşturuldu.

## Arama önceliği
- Barkod
- Stok kodu
- Ürün adı
- Marka

## Hızlı satış
Ürün bulunduğunda:
- satış fiyatı,
- KDV,
- mevcut stok,
- raf adresi

görülebilir ve satış satırı oluşturulabilir.

## Güvenlik
- Pasif ürün satılamaz.
- Yetersiz stok varsa satır oluşturulamaz.
- Miktar pozitif tam sayı olmalı.
- Gerçek stok düşümü V49/V61 işlem zinciri üzerinden yapılmalıdır.
- Barkod okutma tek başına database yazımı yapmamalıdır.

## Ücretsiz mimari
Harici barkod servisi kullanılmadı.
Production verisi değiştirilmedi.
