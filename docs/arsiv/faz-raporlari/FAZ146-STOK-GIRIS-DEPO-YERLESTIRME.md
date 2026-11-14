# FAZ 146 — Stok Giriş & Depo Yerleştirme Merkezi

Onaylanan mal kabul kayıtlarının fiziksel stoğa alınması ve depo/raf konumuna
yerleştirilmesi için merkezi domain oluşturuldu.

## Akış
Mal Kabul Onayı → Stok Girişi → Depo Seçimi → Raf Atama → Barkod →
Yerleştirme → Stok Güncelleme

## Kayıtlar
- Ürün
- Miktar
- Depo
- Raf
- Barkod
- Giriş tarihi
- İşlemi yapan personel
- Mal kabul bağlantısı

## Güvenlik
Aynı mal kabul + ürün + depo kombinasyonunun tekrar stok girişi olarak
işlenmesini önlemek için idempotency anahtarı kullanılır.

Production verisi değiştirilmedi.
