# FAZ 14 — Çift Kayıt / Idempotency

## Amaç
Aynı satışın tekrar gönderilmesi halinde stok, kasa, banka, POS veya cari hareketlerinin ikinci kez oluşmasını önleyecek deterministik anahtarlar oluşturuldu.

## Ana anahtar
`satis-finans-zinciri:<satisId>`

## Alt hareket anahtarları
- ödeme
- stok
- cari
- kasa/banka/POS

Her hareket satış ID'si üzerinden deterministik kimlik alır.

## Önemli
Bu katman anahtar üretir ve tekrar kontrolü için sözleşme sağlar. Üretim ortamında gerçek garanti için aynı anahtarın database üzerinde UNIQUE constraint ile korunması ve transaction içinde kontrol edilmesi gerekir.
