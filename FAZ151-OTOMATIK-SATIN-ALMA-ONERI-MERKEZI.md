# FAZ 151 — Otomatik Satın Alma Öneri Merkezi

V148 replenishment ve V150 karar katmanından gelen stok ihtiyaçlarını
tedarikçi/fiyat bilgisiyle birleştirerek satın alma önerisine dönüştürmek için
merkezi yapı oluşturuldu.

## Akış
Stok İhtiyacı → Tedarikçi Seçimi → Önerilen Miktar → Maliyet →
Yönetici Onayı → Satın Alma Siparişi

## Kontroller
- Minimum sipariş miktarı
- Birim alış fiyatı
- Tahmini teslim süresi
- Tedarikçi tercih puanı
- Toplam satın alma tutarı

## Güvenlik
Öneri doğrudan sipariş oluşturmaz. Önce yönetici onayına gider.
Aynı ürün + depo + dönem için tekrar öneri oluşması idempotency anahtarıyla
önlenebilir.

Production verisi değiştirilmedi.
