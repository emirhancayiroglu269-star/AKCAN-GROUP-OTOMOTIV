# FAZ 58 — Belge Numaralandırma / Seri / Arama

Belge motoruna kontrollü seri ve numara sistemi eklendi.

## Seriler
- SF — Satış Faturası
- AF — Alış Faturası
- SI — Satış İade
- AI — Alış İade
- SP — Satış Proforma
- AP — Alış Proforma

## Format

`SERİ + YIL + 9 haneli sıra`

Örnek:
`SF2026000000001`

## Kurallar
- Seri aktif olmalı.
- Seri yılı belge yılıyla eşleşmeli.
- Numara sıralı ilerlemeli.
- Numara tekrar kullanılmamalı.
- Gerçek database tarafında numara tahsisi transaction/unique constraint ile korunmalı.

## Arama
Belge numarası, müşteri/tedarikçi ve kaynak belge numarası üzerinden arama metni
oluşturulabilir.

## Ücretsiz mimari
Harici numaralandırma servisi kullanılmadı.
Production verisi değiştirilmedi.
