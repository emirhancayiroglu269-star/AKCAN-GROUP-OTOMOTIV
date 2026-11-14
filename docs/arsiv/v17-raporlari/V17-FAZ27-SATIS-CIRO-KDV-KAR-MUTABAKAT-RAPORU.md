# V17 Faz 27 — Satış Ciro / KDV / Kâr Mutabakatı

## Kritik bulgu
Satış ekranında `genelIskonto` satış toplamından düşülüyordu; ancak satış kalemlerinde bu genel iskonto payı ayrı saklanmadığı için kalem bazlı raporlar:
- marka,
- kategori,
- personel,
- tarih,
- ürün performansı,
- stok performansı,
- kampanya raporları

genel iskontoyu eksik yansıtabiliyordu.

Bu durum ekranın satış toplamı ile rapor ciro/kâr rakamları arasında sapma oluşturabilirdi.

## Yapılan düzeltme

Satış kaydedilirken genel iskonto, her kalemin satır-iskontosu sonrası tutarına oransal dağıtılıyor ve `genelIskontoPayi` olarak kalıcı saklanıyor.

Son kaleme kalan kuruş farkı verilerek:

`Σ genelIskontoPayi = satış.genelIskontoTutari`

garantisi sağlandı.

Kalem bazlı ciro artık:

`adet × birimFiyat − satırİskontosu − genelIskontoPayi`

olarak hesaplanıyor.

Kalem bazlı brüt kâr da aynı gerçek satış fiyatı üzerinden hesaplanıyor.

## KDV

Satış ekranındaki KDV ayrıştırması:
- satır iskontosu,
- genel iskonto,
- KDV oranı

sonrası KDV dahil net tutardan yapılıyor.

Örnek:
118 TL KDV dahil (%20) satış → 108 TL genel iskonto sonrası:
- Net matrah: 90 TL
- KDV: 18 TL
- Toplam: 108 TL

## Regresyon testleri

- Tek satır genel iskonto → satış toplamı = rapor cirosu: **PASS**
- Tek satır KDV %20 ayrıştırması: **PASS**
- Çok satır genel iskonto paylarının toplamı: **PASS**
- Çok satır rapor cirosu = satış genel toplamı: **PASS**
- Eski eksik genel-iskonto ciro formülü kalan dosya: **0**
- 89 TS/TSX dosyası transpile: **0 diagnostic**

## Sonuç

Satış ekranındaki toplam, kaydedilen satış belgesi, kalem bazlı raporlar ve brüt kâr hesabı arasındaki temel iskonto mutabakatı güçlendirildi.
