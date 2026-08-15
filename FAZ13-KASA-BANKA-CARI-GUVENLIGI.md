# FAZ 13 — Kasa / Banka / Cari Güvenliği

## Kontroller
- Ödeme toplamı satış toplamıyla eşleşiyor.
- Sıfır/negatif/geçersiz ödeme hareketleri reddediliyor.
- Ödeme türüne göre kasa/banka/POS hesabı belirleniyor.
- Açık hesap satışında cari borç hareketi oluşturuluyor.
- İadede para hareketi ters yönde oluşturuluyor.
- Hareketlere satış referansı bağlanıyor.

## Temel zincir

Peşin/Kart satış:
`Satış → Ödeme → Kasa/Banka/POS Tahsilat`

Açık hesap:
`Satış → Cari Borç`

İade:
`İade → Kasa/Banka/POS Ters Hareket`

## Not
Bu katman hareket üretme/doğrulama katmanıdır. Gerçek database transaction ve idempotency kontrolü mevcut server/Edge Function katmanında uygulanmalıdır.
