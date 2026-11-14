# FAZ 68 — Sevkiyat / İrsaliye Motoru

Stok rezervasyonu gerçek sevkiyat sürecine bağlandı.

## Akış

`Sipariş → Rezervasyon → Sevkiyat/İrsaliye → Stok Çıkışı → Fatura`

## Sevkiyat durumları
- HAZIRLANIYOR
- KISMI_SEVK
- SEVK_EDILDI
- IPTAL

## Kurallar
- Sevk miktarı sipariş miktarını aşamaz.
- Toplam sevk sipariş miktarını aşamaz.
- Sevk için depo + lokasyon zorunlu.
- Rezervasyon kullanımı sevk miktarı kadar azalır.
- Gerçek stok çıkışı V49/V61 hareket motorundan yapılır.
- İrsaliye numarası V58 belge numaralandırma sistemine bağlanmalıdır.
- Idempotency key ile mükerrer sevk engellenmelidir.

## Fatura bağlantısı
Sevk edilen miktar daha sonra V66 satış sürecindeki faturalama miktarına aktarılır.
Kısmi sevk varsa yalnızca sevk edilen miktar faturalanabilir.

Production verisi değiştirilmedi.
