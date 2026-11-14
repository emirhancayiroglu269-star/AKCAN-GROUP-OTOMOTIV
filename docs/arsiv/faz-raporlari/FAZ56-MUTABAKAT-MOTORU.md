# FAZ 56 — Tam Finansal Mutabakat Motoru

Tek işlem motorunun bütün taraflarının birbirini doğrulaması sağlandı.

## Kontrol edilen alanlar
- Stok
- Kasa
- Banka
- POS
- Cari
- KDV
- Maliyet
- Brüt kâr

## Çalışma

Bir işlem oluşturulduğunda beklenen etkiler hesaplanır.
Gerçekleşen hareketlerin toplamı ile karşılaştırılır.

Fark toleransın üzerindeyse işlem:
`MUTABAKAT_BASARISIZ`

olarak işaretlenmelidir.

## Round-trip

Satış → İade

veya

Alış → İade

sonrasında bütün etkiler sıfıra dönmelidir.

## Güvenlik

Mutabakat başarısızsa finansal commit öncesinde işlem durdurulmalıdır.
Production verisi değiştirilmedi.
