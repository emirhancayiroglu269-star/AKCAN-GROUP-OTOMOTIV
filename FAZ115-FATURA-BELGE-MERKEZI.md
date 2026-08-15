# FAZ 115 — Fatura & Belge Merkezi

ERP'nin satış, alış, cari ve finans hareketlerinin belge katmanı oluşturuldu.

## Belge türleri
- Satış Faturası
- Alış Faturası
- E-Fatura
- E-Arşiv
- İrsaliye

## Belge akışı
Taslak → Onaylandı → Gönderildi

İptal ayrı bir durumdur ve ters işlem motoru üzerinden ele alınmalıdır.

## Belge numarası
Seri + 9 haneli sıra numarası standardı tanımlandı.

## Entegrasyon
Her belge bir referans işlemine bağlanır. Referans + belge tipi ile idempotency
anahtarı kullanılarak aynı belgenin ikinci kez oluşturulması engellenir.

## Çıktı
Onaylanmış/gönderilmiş belgeler PDF/print katmanına aktarılabilir.

Production verisi değiştirilmedi.
