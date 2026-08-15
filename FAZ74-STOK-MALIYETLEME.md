# FAZ 74 — Stok Maliyetleme Motoru

Stok maliyetinin satış kârıyla tutarlı hesaplanması için merkezi maliyetleme
katmanı oluşturuldu.

## Desteklenen yöntemler
- Hareketli ortalama maliyet
- FIFO
- Son alış maliyeti

## Hareketli ortalama
Yeni alış geldiğinde:

`Yeni Ortalama = (Mevcut Değer + Yeni Alış Değeri) / Toplam Miktar`

## FIFO
Satış maliyeti en eski stok katmanlarından tüketilir.

## Son alış
Son kabul edilen alışın birim maliyeti referans alınır.

## Kâr
`Brüt Kâr = Net Satış - Satılan Miktar × Birim Maliyet`

## ERP kuralı
Maliyet yöntemi şirket ayarı olarak seçilebilir ve geriye dönük hareketlerde
aynı yöntem korunmalıdır. Satış anındaki maliyet snapshot'ı belgeye kaydedilmelidir.

KDV maliyet hesabına şirketin vergi/muhasebe politikasına göre ayrıca bağlanmalıdır;
bu motor KDV'yi otomatik olarak maliyete dahil etmez.

Production verisi değiştirilmedi.
