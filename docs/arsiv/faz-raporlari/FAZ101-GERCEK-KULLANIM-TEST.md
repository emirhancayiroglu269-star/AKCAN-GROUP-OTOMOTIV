# FAZ 101 — Gerçek Kullanım / Uçtan Uca Smoke Test

Amaç: V80-V100 arasında oluşturulan domain katmanlarının tek bir satış senaryosunda
birlikte çalıştığını doğrulamak.

## Senaryo
1. Ürün bulunur.
2. Satış oluşturulur.
3. Stok düşer.
4. Brüt kâr hesaplanır.
5. Ödeme kaydı kontrol edilir.
6. Audit olayı oluşur.
7. Kritik bildirim modeli kontrol edilir.
8. Rol yetkisi kontrol edilir.
9. Yedek kurtarma koşulları kontrol edilir.
10. Yönetici raporundaki ciro/kâr/stok değerleri mutabık edilir.

## Test sonucu
Temel senaryo için smoke test dosyası eklendi.

Not: Bu test üretim verisi üzerinde çalıştırılmaz; deterministik örnek veri kullanır.
Production verisi değiştirilmedi.
