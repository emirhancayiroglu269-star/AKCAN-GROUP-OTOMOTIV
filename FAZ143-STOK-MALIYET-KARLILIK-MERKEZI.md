# FAZ 143 — Stok Maliyet & Karlılık Merkezi

Ürün bazında güncel maliyet, satış fiyatı ve gerçek kârlılığın birlikte
izlenebilmesi için merkezi maliyet/kârlılık domain'i oluşturuldu.

## Maliyet yöntemleri
- Son alış
- Ağırlıklı ortalama
- FIFO

## Karlılık
Net satış fiyatı, maliyet, kâr tutarı ve kâr marjı hesaplanabilir.

## Güvenlik
Maliyet altı satış kontrolü ve minimum kâr marjı kuralı uygulanabilir.

## Hareket bağlantısı
Maliyet değişimleri alış, alış iadesi ve düzeltme hareketleriyle referanslanabilir.
Aynı referansın tekrar işlenmesini önlemek için idempotency anahtarı kullanılır.

Production verisi değiştirilmedi.
