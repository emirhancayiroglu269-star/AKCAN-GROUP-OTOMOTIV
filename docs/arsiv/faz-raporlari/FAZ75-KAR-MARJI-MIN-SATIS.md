# FAZ 75 — Kâr Marjı / Minimum Satış Fiyatı Motoru

Ürün bazında minimum satış ve hedef marj hesaplama altyapısı oluşturuldu.

## Temel hesap

`Minimum Net Satış = (Birim Maliyet + Sabit Gider Payı) / (1 - Hedef Marj)`

Örneğin toplam maliyet 100 TL ve hedef brüt marj %25 ise:

`100 / 0,75 = 133,33 TL`

## Komisyon + KDV
Platform/POS gibi komisyonların ve KDV'nin etiket fiyatına etkisi ayrıca
hesaplanabilir.

## Kâr
`Brüt Kâr = Net Satış - Maliyet`

`Brüt Marj = Brüt Kâr / Net Satış`

## ERP kuralı
Minimum satış fiyatı bir "uyarı/koruma" katmanı olarak kullanılmalıdır.
Yetkili kullanıcı gerekçeli override yapabilir; override kullanıcı, tarih,
eski fiyat, yeni fiyat ve gerekçe ile audit kaydına alınmalıdır.

Production verisi değiştirilmedi.
