# FAZ 114 — Finans Yönetim Merkezi

Kasa, banka ve POS hareketleri tek finans merkezinde modellenir.

## Hesaplar
- Kasa
- Banka
- POS

## Hareketler
- Tahsilat
- Ödeme
- Gelir
- Gider
- Hesaplar arası transfer

## Finans özeti
- Toplam kasa
- Toplam banka
- Toplam POS
- Net finansal bakiye

## Entegrasyon
Satış tahsilatları ve alış ödemeleri ilgili finans hesabına bağlanır.
Cari hareket ile finans hareketinin referansları eşleştirilir.
Hareketlerde idempotency anahtarı kullanılır.

Production verisi değiştirilmedi.
