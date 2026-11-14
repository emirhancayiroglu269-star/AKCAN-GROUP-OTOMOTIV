# V17 Faz 25 — Satış/Kasa Fiyat Değişikliği Regresyon Hardening

## Problem
Satış/Kasa ekranındaki birim fiyat input'u her `onChange` olayında fiyat değişikliğini kalıcı sepet state'ine uyguluyor ve yetki yoksa her tuş vuruşunda yönetici onayı isteyebiliyordu. Bu, fiyat yazarken modal/prompt açılması, ara değerlerin kaydedilmesi ve UI akışının kesilmesi riskini oluşturuyordu.

## Düzeltme
Birim fiyat artık iki aşamalı çalışıyor:

1. `onChange` → yalnızca `fiyatTaslaklari` içinde geçici değer tutulur.
2. `onBlur` veya Enter → tek seferde doğrulama + yönetici onayı + sepet fiyat güncellemesi + işlem geçmişi kaydı yapılır.

Kurallar:
- Negatif/Geçersiz fiyat kabul edilmez.
- Değişiklik yoksa kayıt oluşturulmaz.
- Yönetici onayı bir tuş vuruşunda değil, gerçek değişiklik commit edildiğinde istenir.
- Onay verilmezse taslak temizlenir ve mevcut satış fiyatı korunur.
- Fiyat iki ondalık basamağa normalize edilir.
- İşlem geçmişine yalnızca gerçek fiyat değişikliği yazılır.

## Fiyat hesaplama zinciri
Birim fiyat → satır iskonto → genel iskonto → KDV ayrıştırması → maliyet/kâr uyarısı → satış toplamı.

Mevcut merkezi `parcaFiyatiHesapla` müşteri yokken de güvenli şekilde normal fiyat/kampanya fiyatı döndürüyor.

## Teknik doğrulama
- 89 TS/TSX dosyası transpile: **0 diagnostic**
- Eski `birimFiyatGuncelle` per-keystroke çağrısı: **0**
- Taslak fiyat state'i: **PASS**
- Blur commit: **PASS**
- Enter commit: **PASS**
- Geçersiz/negatif fiyat kontrolü: **PASS**
