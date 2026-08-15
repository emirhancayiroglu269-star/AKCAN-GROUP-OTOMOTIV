# FAZ 19 — Finans Senaryo Testleri

Üretim verisine yazmadan test edilecek senaryolar:

1. Normal peşin satış
2. Kredi kartı satış
3. Açık hesap satış
4. Peşin alış
5. Vadeli alış
6. Kısmi ödeme/tahsilat
7. Tam iade
8. Kısmi iade
9. Satış iptali
10. Çift kayıt denemesi

Her senaryoda:
`Satış + Ödeme + Stok + Cari + Kasa/Banka + KDV + Maliyet + Brüt Kâr`

karşılaştırılır.

Not: Test beklentileri üretim muhasebe kaydı değildir. Gerçek çalışma için test runner/CI veya uygulama içi test ortamı gerekir.
