# FAZ 85 — Gider Yönetimi / Bütçe / Aylık Analiz

Giderler merkezi olarak kategorize edilir ve bütçeyle karşılaştırılır.

## Gider kategorileri
Kira, personel, elektrik, su, internet, telefon, kargo, nakliye, vergi,
muhasebe, pazarlama, banka/POS, bakım ve diğer.

## Her gider
- Kategori
- Açıklama
- Tutar
- Tarih
- Vade
- Kasa/banka hesabı
- Belge
- Sabit/değişken ayrımı
- Idempotency key

## Aylık analiz
- Toplam gider
- Sabit gider
- Değişken gider
- Toplam bütçe
- Bütçe farkı
- Bütçe kullanım yüzdesi

## Kârlılık bağlantısı
V74 maliyet + V75 brüt kâr + V85 faaliyet giderleri birleştirilerek
net faaliyet kârı hesaplamasının temel altyapısı hazırlanır.

`Net Faaliyet Kârı = Brüt Kâr - Faaliyet Giderleri`

Giderler muhasebe/finans hareketlerine bağlanmalı; manuel girişler audit
kaydı taşımalıdır.

Production verisi değiştirilmedi.
