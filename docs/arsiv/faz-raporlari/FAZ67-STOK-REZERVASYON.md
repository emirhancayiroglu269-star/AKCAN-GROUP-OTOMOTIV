# FAZ 67 — Stok Rezervasyon Motoru

Siparişlerin stok üzerinde kontrollü rezervasyon oluşturması sağlandı.

## Temel mantık

`Mevcut Stok - Ayrılmış Stok = Kullanılabilir Stok`

Sipariş geldiğinde rezervasyon oluşturulur.
Rezervasyon stok hareketi değildir; fiziksel stok sevk edilene kadar stoktan
ayrı bir "ayrılmış" miktar olarak izlenir.

## Rezervasyon durumları
- AKTİF
- KISMEN_KULLANILDI
- TAMAMLANDI
- İPTAL

## Sevk bağlantısı
Sevk başladığında rezervasyon miktarı kullanılır ve gerçek stok çıkışı V49/V61
motorundan gerçekleştirilir.

## İptal
Sipariş iptal edilirse kullanılmamış rezervasyon serbest bırakılır.

## Kurallar
- Ayrılabilecek miktar kullanılabilir stoktan fazla olamaz.
- Kullanılan miktar rezervasyonu aşamaz.
- Rezervasyon idempotency key taşır.
- Aynı sipariş kaleminin mükerrer rezervasyonu transaction içinde engellenmelidir.
- Rezervasyon tek başına fiziksel stok düşürmez.

Production verisi değiştirilmedi.
