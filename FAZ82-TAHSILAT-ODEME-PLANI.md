# FAZ 82 — Tahsilat / Ödeme Planı / Vade Takibi

Cari hesapların tahsilat planı ve vade takibi oluşturuldu.

## Ödeme planı
Her taksit:
- Cari
- Belge
- Vade tarihi
- Tutar
- Tahsil edilen
- Kalan
- Durum

bilgilerini taşır.

## Tahsilat durumları
- BEKLİYOR
- KISMEN TAHSİL
- TAHSİL EDİLDİ
- GECİKTİ
- İPTAL

## Tahsilat yöntemleri
- Nakit
- POS
- Havale
- Çek
- Senet

## Kurallar
- Tahsilat taksit tutarını aşamaz.
- Kısmi tahsilat desteklenir.
- Vadesi geçen ve bakiyesi kalan taksitler otomatik gecikmiş olarak işaretlenir.
- Her tahsilat idempotency key taşır.
- Tahsilat finans/kasa/banka hareket motoruna bağlanmalıdır.
- Gecikmiş tahsilatlar V81 cari risk hesabına yansıtılmalıdır.

Production verisi değiştirilmedi.
