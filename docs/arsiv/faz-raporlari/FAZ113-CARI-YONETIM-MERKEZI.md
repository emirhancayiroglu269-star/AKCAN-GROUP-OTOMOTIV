# FAZ 113 — Cari Yönetim Merkezi

Müşteri ve tedarikçi cari işlemleri tek merkezde modellenir.

## Cari kart
- Müşteri / Tedarikçi
- Ünvan
- Vergi no
- Telefon
- Vade günü
- Cari limit
- Aktif/pasif

## Cari hareketleri
- Satış
- Alış
- Tahsilat
- Ödeme
- İade
- Devir

## Özet
- Toplam borç
- Toplam alacak
- Bakiye
- Risk

## Vade
Cari karttaki vade gününe göre vade tarihi hesaplanır.

## Güvenlik
Cari hareketleri referans + cari + hareket tipi ile idempotent tutulmalıdır.
Tahsilat/ödeme tutarı pozitif olmalı ve mevcut bakiyeyi aşmamalıdır.

Production verisi değiştirilmedi.
