# FAZ 70 — Mal Kabul + Depo/Raf Yerleştirme

Satın alma süreci fiziksel mal kabul ve depo yerleştirmeye bağlandı.

## Akış

`Alış Siparişi → Mal Kabul → Kontrol → Kabul/Red → Depo → Raf/Göz`

## Kalem bazında
- Sipariş miktarı
- Gelen miktar
- Kabul miktarı
- Red miktarı
- Yerleşen miktar
- Depo
- Lokasyon

## Kurallar
- Kabul + red, gelen miktarı aşamaz.
- Yerleşen miktar, kabul miktarını aşamaz.
- Kabul edilen ürünler bir veya birden fazla lokasyona dağıtılabilir.
- Lokasyon dağılımının toplamı kabul miktarına eşit olmalıdır.
- Gerçek stok girişi mal kabul onayında V49/V61 stok hareket motorundan yapılmalıdır.
- Yerleştirme fiziksel stokun kaynağıdır; ürün kartındaki stok yalnızca özet/cache olmalıdır.
- Idempotency ile mükerrer mal kabul engellenmelidir.

Production verisi değiştirilmedi.
