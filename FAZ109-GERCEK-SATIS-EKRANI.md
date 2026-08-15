# FAZ 109 — Gerçek Satış Ekranı

Satış ekranının domain akışı tek zincir halinde tanımlandı.

## Ekran sırası
1. Ürün/OEM/Barkod ara
2. Ürünü sepete ekle
3. Miktarı düzenle
4. Müşteri seç
5. İskonto uygula
6. KDV hesapla
7. Ödeme tipini seç
8. Satışı tamamla

## Ödeme tipleri
- Nakit
- Kart
- Havale
- Açık Hesap

Açık hesap satışta müşteri zorunludur.

## Satış sonucu
- Ara toplam
- KDV
- Genel toplam
- Toplam maliyet
- Brüt kâr

## Güvenlik / veri bütünlüğü
Satış tamamlanırken istemci işlem kimliği ile idempotency anahtarı kullanılmalıdır.
Aynı satışın çift tıklama/yenileme nedeniyle ikinci kez oluşturulması engellenmelidir.

Satışın kalıcı transaction'ında stok, cari, kasa/banka, belge ve audit hareketleri
tek iş mantığı içinde başarılı/başarısız olarak ele alınmalıdır.

Production verisi değiştirilmedi.
