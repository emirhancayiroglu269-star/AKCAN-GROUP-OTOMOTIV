# FAZ 65 — Fiyat / İskonto / Kampanya Motoru

Satış fiyatlandırması merkezi hale getirildi.

## Fiyat kaynakları
1. Liste fiyatı
2. Müşteri özel fiyatı
3. Toplu alım fiyatı
4. Kampanya fiyatı

## Öncelik
Kurallar `oncelik` değerine göre değerlendirilir.
İlk uygun kural uygulanır.

## Tarih
Kampanya başlangıç/bitiş tarihleri kontrol edilir.

## İskonto
Satır bazında %0-100 arası iskonto hesaplanabilir.

## Güvenlik
- Negatif fiyat yok.
- Negatif miktar yok.
- %100 üzeri iskonto yok.
- Fiyat kuralı doğrudan stok/finans yazımı yapmaz.
- Nihai fiyat V63 satış motoruna aktarılır.
- Kâr ve mutabakat V54/V56 zincirinde yeniden hesaplanır.

Production verisi değiştirilmedi.
