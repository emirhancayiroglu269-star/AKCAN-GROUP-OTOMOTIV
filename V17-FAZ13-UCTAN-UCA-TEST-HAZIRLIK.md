# V17 Faz 13 — Uçtan Uca Test Hazırlığı

Bu fazda finans/stok verisini değiştirmeden, merkezi motorların kapsaması ve doğrudan UI stok yazma riskleri tarandı.

Senaryo sayısı: 20

1. Satış → stok çıkışı — stok + cari + kasa
2. Satış → açık hesap — stok + cari
3. Satış → kart/POS — stok + POS
4. Satış → iade — stok + cari + kasa
5. Mal alış → stok girişi — stok + tedarikçi
6. Mal alış → peşin ödeme — stok + tedarikçi + kasa
7. Mal alış → vadeli — stok + tedarikçi
8. Tedarikçi ödeme — cari + kasa
9. Müşteri tahsilat — cari + kasa
10. Sayım — stok
11. Depo transferi — stok
12. POS mutabakatı — POS + banka
13. Gider — gider + kasa
14. Gider iptali — gider + kasa
15. Satış iptali — stok + cari + kasa
16. Alış iadesi — stok + tedarikçi + kasa
17. Kısmi ödeme — cari + kasa
18. Kısmi tahsilat — cari + kasa
19. Rapor kârı — rapor + maliyet
20. Çoklu bilgisayar çakışması — versiyon

## Notlar
- Merkezi motor referansı bulunan dosya sayısı: 15
- UI'da doğrudan stok mutasyonu sinyali bulunan dosya sayısı: 6
- Bu fazda üretim verisi değiştirilmedi.
- Bir sonraki güvenli adım, doğrudan stok mutasyonu bulunan modülleri tek tek inceleyip motor dışı yazmaları kaldırmaktır.