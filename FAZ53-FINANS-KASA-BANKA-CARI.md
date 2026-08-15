# FAZ 53 — Kasa / Banka / POS / Cari Finans Motoru

Finans hareketleri tek bir standartta modellendi.

## Hesap tipleri
- Kasa
- Banka
- POS
- Cari

## Hareketler
- Tahsilat
- Ödeme
- Satış
- Alış
- İade
- İptal
- Transfer
- Düzeltme

## Ana kural
Her finans hareketi:
- kaynak işlem,
- idempotency key,
- hesap,
- tutar,
- tarih

bilgisine sahip olmalı.

## Zincir
Satış → ödeme hesabı → cari/kasa/banka/POS

Alış → ödeme hesabı → tedarikçi cari/kasa/banka

İade/iptal → ilgili finans hareketinin ters kaydı.

Gerçek transaction/RPC katmanında stok + finans + cari aynı işlem bütünlüğünde korunmalıdır.

Production verisi değiştirilmedi.
