# FAZ 141 — Stok Sayım & Depo Mutabakat Merkezi

Fiziki stok ile sistem stokunun karşılaştırılması ve farkların kontrollü şekilde
düzeltilmesi için merkezi sayım domain'i oluşturuldu.

## Akış
Sayım Başlat → Raf Seç → Fiziki Adet Gir → Sistemle Karşılaştır →
Fark İncele → Onay → Stok Düzeltme → Mutabakatı Kapat

## Sayım
- Depo
- Raf
- Ürün
- Sistem adedi
- Fiziki adet
- Fark
- Fark tipi
- Sayan personel
- Tarih

## Farklar
- Eksik
- Fazla
- Eşit

## Güvenlik
Stok düzeltmesi onaylayan kullanıcı ve tarih ile kayıt altına alınır.
Aynı depo + raf + ürün kombinasyonu için idempotency anahtarı kullanılır.

Production verisi değiştirilmedi.
