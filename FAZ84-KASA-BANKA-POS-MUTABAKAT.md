# FAZ 84 — Kasa / Banka / POS / Mutabakat

ERP'nin para hesapları merkezi hale getirildi.

## Hesap tipleri
- KASA
- BANKA
- POS

## Finans hareketleri
- Giriş
- Çıkış
- Transfer
- Tahsilat
- Ödeme
- POS satış
- POS kesinti
- Düzeltme

## Mutabakat
Sistem bakiyesi ile gerçek/sayılan bakiye karşılaştırılır:

`Fark = Sayılan Bakiye - Sistem Bakiyesi`

Sonuç:
- TAM
- EKSİK
- FAZLA

## POS
POS satışından komisyon düşülerek net tutar hesaplanabilir.

## Güvenlik
- Her finans hareketi idempotency key taşır.
- Transferde kaynak bakiye yeterli olmalıdır.
- Mutabakat farkı ayrı düzeltme hareketiyle kapatılmalıdır.
- Gerçek banka/POS entegrasyonu varsa dış hareketler kaynak belge olarak
  saklanmalı; manuel düzeltmeler audit'e yazılmalıdır.

Production verisi değiştirilmedi.
