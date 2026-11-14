# FAZ 71 — Stok Transfer Motoru

Depo ve raflar arasında güvenli stok transferi oluşturuldu.

## Desteklenen transferler
- Depo → Depo
- Raf → Raf
- Aynı depo içinde raf → raf
- Depolar arası raf → raf

## Akış

`Transfer Taslağı → Onay → Kaynak Çıkış → Hedef Giriş → Tamamlandı`

## Kurallar
- Kaynak depo/lokasyon zorunlu.
- Hedef depo/lokasyon zorunlu.
- Kaynak ve hedef aynı olamaz.
- Kaynak stok miktarı yeterli olmalı.
- Transfer net stoğu değiştirmez.
- Kaynak lokasyon azalır, hedef lokasyon aynı miktarda artar.
- Tek idempotency key ile mükerrer transfer engellenmelidir.
- Transfer atomik transaction içinde tamamlanmalıdır.

Production verisi değiştirilmedi.
