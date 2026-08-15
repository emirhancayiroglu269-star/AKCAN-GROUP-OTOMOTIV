# FAZ 17 — Alış / Tedarikçi / Stok / Ödeme

Alış tarafı zinciri:

`Alış → Stok Girişi → Tedarikçi Borcu → Kasa/Banka Ödemesi → Maliyet`

Kontroller:
- Alış ID zorunlu.
- Negatif/geçersiz belge toplamı engellenir.
- Kalem toplamı belge toplamını aşamaz.
- Tedarikçi borcu belge toplamıyla eşleşir.
- Ödeme belge toplamını aşamaz.
- Stok hareketleri pozitif giriş olarak üretilir.
- Her hareket alış referans ID'sine bağlanır.

Bu katman yazma işlemi yapmaz; işlem öncesi doğrulama ve deterministik hareket üretimi sağlar.
