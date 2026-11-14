# FAZ 69 — Satın Alma Süreci

Satış tarafındaki zincirin satın alma karşılığı oluşturuldu.

## Akış

`TALEP → TEDARİKÇİ TEKLİFİ → SİPARİŞ → MAL KABUL → FATURA → TAMAMLANDI`

Gerekirse sipariş doğrudan faturalanabilir.

## Kurallar

- Tedarikçi zorunlu.
- Belge numarası zorunlu.
- Idempotency key zorunlu.
- Sipariş miktarı aşılmaz.
- Kısmi mal kabul desteklenir.
- Kısmi faturalama desteklenir.
- Mal kabul stok girişinin tetikleyicisidir.
- Alış faturası tedarikçi cari + finans + KDV hareketlerini üretir.
- İptal kaynak belgeye bağlı ters işlem olarak çalışmalıdır.

## Stok / finans

Talep: stok/finans hareketi yok.
Tedarikçi teklifi: stok/finans hareketi yok.
Sipariş: varsayılan olarak stok/finans hareketi yok.
Mal kabul: stok girişi.
Fatura: tedarikçi cari + finans + KDV.
İptal: kaynak işleme bağlı ters hareket.

Production verisi değiştirilmedi.
