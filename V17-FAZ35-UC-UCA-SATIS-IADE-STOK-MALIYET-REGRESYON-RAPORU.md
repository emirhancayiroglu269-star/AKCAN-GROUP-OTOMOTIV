# V17 Faz 35 — Uçtan Uca Satış / İade / Stok / Maliyet Regresyonu

## Amaç
Faz 14–34 boyunca kurulan stok, maliyet, satış, iade ve mutabakat kurallarını tek bir gerçekçi senaryoda tekrar doğrulamak.

## Senaryo

1. Alış: 10 adet × 500 TL maliyet
2. Satış: 5 adet × 1.200 TL KDV dahil
3. Satış tahsilatı: 6.000 TL
4. Kısmi iade: 2 adet × 1.200 TL
5. İade sonrası stok: 7 adet
6. İade sonrası kalan 3 adet için brüt kâr
7. Aynı alışın tekrar gelmesi
8. Aynı iadenin tekrar gelmesi
9. Yetersiz stokla satış denemesi
10. Son uçtan uca mutabakat

## Beklenen sonuçlar

- Alış sonrası stok: 10
- Satış sonrası stok: 5
- Kısmi iade sonrası stok: 7
- Satış brüt kârı: 2.500 TL
- İade sonrası kalan brüt kâr: 1.500 TL
- Aynı alış ikinci kez işlenmez
- Aynı iade ikinci kez işlenmez
- Yetersiz stok satışı engellenir
- Son mutabakat: TEMİZ

## Test sonucu

Tüm senaryolar **PASS**.

Ayrıca:
- 90 TS/TSX dosyası → 0 diagnostic
- Faz 31/32/33/34 mutabakat katmanları korunuyor
- ZIP bütünlük testi → PASS

## Önemli sınır
Bu faz, gerçek tarayıcı UI üzerinden buton tıklama testi değil; mevcut merkezi motorların gerçek fonksiyonları transpile edilerek çalıştırılan regresyon testidir. Böylece stok/maliyet/idempotency/mutabakat çekirdeği UI'dan bağımsız olarak doğrulanır.
