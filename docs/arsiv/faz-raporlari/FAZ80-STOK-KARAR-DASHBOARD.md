# FAZ 80 — Stok Karar Dashboardu

V78 ve V79 stok motorları tek karar ekranında birleştirildi.

## Ana sorular
- Bugün ne almalıyım?
- Hangi ürün hızlı dönüyor?
- Hangi ürün satışta desteklenmeli?
- Hangi ürünü satın almayı durdurmalıyım?
- Hangi ürünleri sadece izlemeliyim?

## Karar türleri
- AL
- SATIŞI DESTEKLE
- DURDUR
- İZLE

## Dashboard metrikleri
- Toplam ürün
- Alınacak ürün sayısı
- Satışı desteklenecek ürün sayısı
- Durdurulacak ürün sayısı
- İzlenecek ürün sayısı
- Toplam önerilen alış adedi
- Son 30 gün ciro
- Son 30 gün brüt kâr

## Kural
Dashboard karar üretir; doğrudan sipariş veya fiyat değişikliği yapmaz.
Onaylanan AL kararları V78 → V69 zincirine, satış aksiyonları V75'e,
ölü stok aksiyonları ilgili kampanya/iade akışına bağlanmalıdır.

Production verisi değiştirilmedi.
