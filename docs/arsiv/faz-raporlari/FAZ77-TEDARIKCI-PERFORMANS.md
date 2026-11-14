# FAZ 77 — Tedarikçi Performans / Akıllı Tedarikçi Seçimi

Tedarikçi seçimini yalnızca en düşük fiyata göre yapmayan puanlama katmanı
oluşturuldu.

## Kriterler
- Fiyat
- Teslimat süresi
- Kalite
- İade oranı
- Ödeme vadesi

Her kriterin ağırlığı toplam %100 olacak şekilde tanımlanır.

## Örnek ağırlık
- Fiyat %35
- Teslimat %20
- Kalite %25
- İade %10
- Vade %10

## Sonuç
Sistem her aday için 0-100 arası puan üretir ve en yüksek puanlı tedarikçiyi
önerir.

## Güvenlik
Bu motor yalnızca öneri üretir; siparişi otomatik olarak kesinleştirmez.
Kullanıcı seçimi ve gerekçesi audit kaydına alınabilir.

Kalite/iade verileri gerçek mal kabul ve iade hareketlerinden türetilmelidir.
Teslimat performansı sipariş ve mal kabul tarihleri arasından hesaplanmalıdır.

Production verisi değiştirilmedi.
