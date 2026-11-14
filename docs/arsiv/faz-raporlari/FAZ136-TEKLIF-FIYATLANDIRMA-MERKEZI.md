# FAZ 136 — Teklif & Fiyatlandırma Merkezi

Teklif oluşturma ve fiyat kontrolü için merkezi domain yapısı oluşturuldu.

## Teklif akışı
Teklif → Onay Bekliyor → Onaylandı → Gönderildi → Kabul Edildi → Satışa Dönüştü

## Teklif kalemi
- Ürün
- Miktar
- Maliyet
- Birim fiyat
- İskonto
- KDV
- Kâr marjı

## Fiyat güvenliği
- Minimum kâr marjı
- Maliyet altı satış engeli
- Yüksek iskonto için onay
- Müşteriye özel fiyat altyapısı

## Satışa dönüşüm
Kabul edilen teklifin satış işlemine dönüştürülmesi için teklif durumu
`SATISA_DONUSTU` olarak tutulabilir.

Production verisi değiştirilmedi.
