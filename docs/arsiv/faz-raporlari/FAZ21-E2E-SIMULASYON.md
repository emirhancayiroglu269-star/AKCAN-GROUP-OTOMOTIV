# FAZ 21 — Gerçek Motor Öncesi E2E Simülasyon

Üretim/Supabase verisine dokunmadan bellek üzerinde şu bakiye zinciri simüle edilir:

`Stok + Kasa + Cari + KDV + Maliyet + Brüt Kâr`

Senaryolar:
- Peşin satış
- Açık hesap satış
- Peşin alış
- Kısmi ödeme
- Tam iade

Her senaryoda başlangıç ve beklenen bitiş bakiyesi karşılaştırılır.

Not: Bu bir in-memory simülasyondur. Gerçek motor ve Supabase transaction testi değildir.
