# FAZ 88 — Raporlama Merkezi

Yönetici dashboardunun altında merkezi rapor üretim katmanı oluşturuldu.

## Dönemler
- Günlük
- Haftalık
- Aylık
- Yıllık

## Rapor başlıkları
### Satış
- Ciro
- Satış adedi
- Sipariş adedi
- Brüt kâr
- Brüt marj

### Finans
- Net faaliyet kârı
- Net marj
- Tahsilat
- Borç
- Gider

### Stok / satın alma
- Stok değeri
- Satın alma toplamı

## Karşılaştırma
Mevcut dönem ile önceki dönem arasında yüzde değişim hesaplanabilir.

## Tasarım
Raporlama katmanı veriyi değiştirmez; yalnızca merkezi hareketlerden rapor üretir.
Böylece raporlar satış, stok, cari ve finans modüllerinden bağımsız kopya
veri üretmek yerine aynı kaynaklardan beslenir.

Production verisi değiştirilmedi.
