# FAZ 16 — Uçtan Uca Satış Zinciri Mutabakatı

Kontrol edilen zincir:

`Satış → Ödeme → Kasa/Banka/POS → Stok → Cari → KDV → Maliyet → Brüt Kâr → Idempotency`

## Kurallar
- Ödeme toplamı = satış toplamı.
- Kasa/banka/POS toplamı = ödeme toplamı.
- Peşin/kart satışında beklenmeyen cari hareketi reddedilir.
- Satış stok hareketleri negatif miktar olmalıdır.
- KDV ve brüt kâr merkezi hesap motorundan gelir.
- Her satışın deterministik idempotency anahtarı vardır.

Bu katman veri yazmaz; işlem öncesi bütünlük kontrolü yapar.
