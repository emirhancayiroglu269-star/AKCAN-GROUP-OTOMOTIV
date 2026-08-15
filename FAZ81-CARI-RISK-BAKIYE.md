# FAZ 81 — Cari / Risk Limiti / Bakiye / Vade

Müşteri cari hesabı ve kredi risk kontrolü oluşturuldu.

## Risk hesabı

`Toplam Risk = Mevcut Bakiye + Açık Sipariş Tutarı`

`Kullanılabilir Limit = Kredi Limiti - Toplam Risk`

## Durumlar
- GÜVENLİ
- İZLE
- RİSKLİ
- LİMİT AŞIMI

## Satış kontrolü
Varsayılan olarak:
- Limit aşımı → satış onayı yok
- Vadesi geçmiş bakiye → satış onayı yok
- Limitin %80'i üzeri → uyarı/izleme
- Limit içinde → satış devam edebilir

Yetkili override ileride kullanıcı, tarih, gerekçe ve belge bağlantısıyla
audit'e alınmalıdır.

## Vade
Cari hareketlerde vade tarihi tutulur ve gün bazında kalan/geçen süre
hesaplanabilir.

Production verisi değiştirilmedi.
