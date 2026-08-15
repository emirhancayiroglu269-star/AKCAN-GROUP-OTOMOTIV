# V17 Faz 30 — İade ↔ Maliyet ↔ Kâr ↔ POS Komisyonu Mutabakatı

## Amaç
Satıştan sonra kısmi iade olduğunda merkezi finansal sonuçların aynı zeminde kalmasını doğrulamak:
- KDV dahil net ciro
- KDV
- KDV hariç net ciro
- SMM
- brüt kâr
- POS komisyonu
- net faaliyet kârı

## Yapılan düzeltme

### POS komisyonu
`karKademeleriHesapla` içinde iptal edilmiş POS tahsilatlarının komisyonu net kârdan çıkarılıyordu.

Artık:
`durum !== "İptal"`

olan POS tahsilatları hesaba katılıyor.

Böylece satış iptal edildiğinde iptal edilen POS işleminin komisyonu kârı ikinci kez bozmaz.

## İade/maliyet/kâr mutabakatı

Örnek regresyon:
- Satış: 10.000 TL KDV dahil
- İade: 2.000 TL
- İade edilen ürün maliyeti: 1.200 TL
- Satış toplam SMM: 6.000 TL
- KDV: %20

Sonuç:
- Net ciro KDV dahil: 8.000 TL
- İade KDV: 333,33 TL
- Net ciro KDV hariç: 6.666,67 TL
- İade sonrası SMM: 4.800 TL
- Brüt kâr: 1.866,67 TL

Bütün sonuçlar regresyon testinden geçti.

## Önceki fazlarla bağlantı
- Faz 27: genel iskonto kalemlere dağıtıldı.
- Faz 28: tam satış iptali atomik hale getirildi.
- Faz 29: kısmi iade, KDV metadata'sı ve kasa/banka koruması güçlendirildi.
- Faz 30: iade sonrası kâr/maliyet mutabakatı ve iptal POS komisyonu temizlendi.

## Teknik doğrulama
- 89 TS/TSX dosyası → 0 diagnostic
- Net ciro mutabakatı → PASS
- İade KDV → PASS
- SMM iade sonrası → PASS
- Brüt kâr → PASS
- İptal POS komisyonu → PASS
- ZIP bütünlük testi → PASS
