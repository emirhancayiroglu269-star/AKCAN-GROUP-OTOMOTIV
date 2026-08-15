# V17 Faz 31 — Uçtan Uca Mutabakat Çekirdeği

## Amaç
Yeni bir finans motoru eklemeden, mevcut merkezi stok/finans çekirdeğinin üstüne sistemin tamamını kontrol eden salt-okuma bir mutabakat katmanı eklemek.

## Kontroller

### 1. Satış → Ödeme
Her aktif satış için:
`genelToplam = ödeme satırları toplamı`

kontrol ediliyor.

### 2. İade → İade kalemleri
Değişim olmayan iadelerde:
`iade.tutar = iade kalemleri toplamı`

kontrol ediliyor. Negatif iade tutarı da raporlanıyor.

### 3. Stok → Stok hareketleri
Her ürün için en son stok hareketindeki `kalanStok` ile ürün kartındaki `stok` karşılaştırılıyor.

Bu, satış/alış/iade/sayım/transfer zincirinde hareket kaydı ile ürün bakiyesi arasındaki sapmaları yakalar.

### 4. Satış → POS
Aynı satış + POS cihazı için birden fazla aktif POS tahsilatı varsa kritik bulgu oluşturuluyor.

İptal edilmiş POS kayıtları bu kontrolde sayılmıyor.

## Tasarım
`ucUcaMutabakatKontrolu` veri değiştirmez.

`ucUcaMutabakatOzeti`:
- temiz
- bulguSayisi
- kritik
- bulgular

döndürür.

Böylece ileride Yönetici Kontrol Paneli'ne güvenli şekilde bağlanabilir.

## Testler

Sentetik temiz veri:
- Mutabakat temiz → **PASS**

Bozuk veri:
- Satış/ödeme farkı → **YAKALANDI**
- Stok farkı → **YAKALANDI**
- Çift POS tahsilatı → **YAKALANDI**

Kod doğrulama:
- 90 TS/TSX dosyası
- **0 diagnostic**
- ZIP bütünlük testi → **PASS**

## Not
Gerçek üretim verisi üzerinde mutabakat sonucu çalıştırılmadı; mevcut ZIP yalnızca kaynak kod içeriyor. Bu fazda çekirdek denetim mekanizması ve regresyon testleri hazırlandı.
