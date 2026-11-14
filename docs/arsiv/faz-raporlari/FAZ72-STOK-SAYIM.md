# FAZ 72 — Stok Sayım / Fark / Düzeltme Motoru

Fiziksel sayım ile sistem stoğunun karşılaştırılması oluşturuldu.

## Formül

`Sayım Farkı = Sayılan Miktar - Sistem Miktarı`

Örnek:
- Sistem: 20
- Sayılan: 18
- Fark: -2 → Eksik stok

veya:
- Sistem: 20
- Sayılan: 23
- Fark: +3 → Fazla stok

## Akış

`Sayım Taslağı → Sayımda → Tamamlandı → Onaylandı → Düzeltme`

## Güvenlik
- Fark kullanıcı tarafından serbestçe yazılmaz; sistem tarafından hesaplanır.
- Sayım onaylanmadan stok düzeltmesi yapılmaz.
- Düzeltme ayrı stok hareketi olarak `SAYIM_DUZELTME` kaynağıyla izlenir.
- Sayım sırasında mükerrer düzeltme idempotency ile engellenmelidir.
- Yetkisiz kullanıcı stok düzeltmesi yapamamalıdır.

Production verisi değiştirilmedi.
