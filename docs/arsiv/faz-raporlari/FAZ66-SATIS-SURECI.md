# FAZ 66 — Teklif → Sipariş → Sevk → Fatura

Satış süreci gerçek ERP akışına dönüştürüldü.

## Akış

`TEKLİF → SİPARİŞ → SEVK → FATURA → TAMAMLANDI`

Bazı siparişler doğrudan faturalanabilir.

## Kurallar

- Durumlar yalnızca tanımlı geçişlerle ilerler.
- Sevk edilen miktar sipariş miktarını aşamaz.
- Faturalanan miktar sipariş miktarını aşamaz.
- Kısmi sevk desteklenir.
- Kısmi faturalama desteklenir.
- Her belge kaynak belgeye bağlanabilir.
- Idempotency key zorunludur.

## Stok/finans davranışı

Teklif: stok/finans hareketi oluşturmaz.
Sipariş: varsayılan olarak stok/finans hareketi oluşturmaz; opsiyonel rezervasyon katmanı ayrıca eklenebilir.
Sevk: stok çıkışı üretir.
Fatura: finans/cari/KDV hareketini üretir.
İptal: kaynak belgeye bağlı ters işlem üretir.

Production verisi değiştirilmedi.
