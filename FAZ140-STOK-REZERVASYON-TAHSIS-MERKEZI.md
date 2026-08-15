# FAZ 140 — Stok Rezervasyon & Tahsis Merkezi

Siparişlerin stokla eşleştirilmesi ve depo bazında ürün tahsisinin güvenli
yönetilmesi için merkezi stok rezervasyon domain'i oluşturuldu.

## Akış
Sipariş → Stok Rezervasyonu → Tahsis → Toplama → Sevkiyat

## Rezervasyon
- Sipariş
- Ürün
- Depo
- İstenen miktar
- Rezerve miktar
- Durum
- Geçerlilik tarihi

## Tahsis
Rezerve stok, belirli depo ve gerekirse raf/personel bilgisiyle tahsis edilebilir.

## Güvenlik
Aynı sipariş + ürün + depo kombinasyonu için idempotency anahtarı kullanılır.
İhtiyaç karşılanmıyorsa tahsis açığı hesaplanır.

Production verisi değiştirilmedi.
