# FAZ 142 — Stok Hareket & Audit Merkezi

Stokta gerçekleşen tüm hareketlerin izlenebilir ve denetlenebilir olması için
merkezi hareket/audit domain'i oluşturuldu.

## Hareketler
- Giriş
- Çıkış
- Transfer
- Rezervasyon
- Rezervasyon serbest bırakma
- Sayım düzeltmesi
- İade
- Fire
- Manuel düzeltme

## Her hareket
Ürün, depo, raf, hareket tipi, miktar, önceki adet, sonraki adet, referans,
kullanıcı ve tarih bilgileri tutulabilir.

## Audit
Stok değişikliğinin hangi kullanıcı tarafından, hangi işlem nedeniyle yapıldığı
ayrı audit kaydıyla takip edilebilir.

## Tutarlılık
Hareketin hesaplanan sonraki stok adedi ile kaydedilen sonraki adet eşleşmelidir.
Aynı referans hareketin tekrar işlenmesini önlemek için idempotency anahtarı
kullanılır.

Production verisi değiştirilmedi.
