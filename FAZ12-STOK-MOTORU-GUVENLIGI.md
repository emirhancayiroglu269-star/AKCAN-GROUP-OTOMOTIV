# FAZ 12 — Stok Motoru Güvenliği

## Eklenen
- Satış öncesi stok yeterlilik kontrolü.
- Satış için negatif stok hareketi üretimi.
- İade için pozitif stok geri giriş hareketi.
- Hareketlere referans ID bağlanması.
- Miktarların pozitif/sonlu doğrulanması.
- Stok yetersizse satış yan etkisi öncesinde işlemin durdurulabilmesi.

## Temel invariant
Satış:
`stok_son = stok_ilk - satilan_miktar`

İade:
`stok_son = stok_ilk + iade_miktari`

## Not
Bu adapter stok hareketi üretir; gerçek database yazımı ve transaction sınırı mevcut motor/Edge Function tarafından yönetilmelidir.
