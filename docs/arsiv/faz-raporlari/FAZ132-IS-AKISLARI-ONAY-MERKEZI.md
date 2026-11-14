# FAZ 132 — İş Akışları & Onay Merkezi

Kritik ERP işlemlerinin kontrollü bir onay sürecinden geçmesi için merkezi
iş akışı ve onay domain'i oluşturuldu.

## Akış
Talep → Onay Bekliyor → Onay / Red / Düzeltme → Tekrar Onay → Tamamlandı

## Onaya bağlanabilen işlemler
- Yüksek tutarlı satış
- Yüksek iskonto
- Açık hesap
- İade
- Ödeme
- Fiyat değişikliği
- Kritik kayıt silme

## Onay kuralları
İşlem türüne göre tutar veya oran eşiği ve gerekli onay rolü tanımlanabilir.

## İzlenebilirlik
Talep eden, onaylayan, referans kayıt, tarih ve karar notları saklanır.
Aynı referans işlem için idempotency anahtarı kullanılır.

Production verisi değiştirilmedi.
