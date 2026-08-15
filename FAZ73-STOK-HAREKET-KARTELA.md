# FAZ 73 — Stok Hareket Geçmişi / Kartela

Her ürün için hareket geçmişinin merkezi modeli oluşturuldu.

## Hareket türleri
- Alış
- Satış
- Alış iadesi
- Satış iadesi
- Transfer çıkış
- Transfer giriş
- Sayım düzeltme
- Sevk
- Mal kabul
- İptal

## Her harekette
- Ürün
- Miktar
- Depo
- Lokasyon
- Kaynak/hedef depo-lokasyon
- Kaynak belge
- Kullanıcı
- Tarih
- Idempotency key
- Açıklama

tutulabilir.

## Kartela
Ürün bazında:
- toplam giriş,
- toplam çıkış,
- net hareket,
- hareket sayısı

özetlenebilir.

## İzlenebilirlik
Her hareket kaynak belgeye ve idempotency key'e bağlanmalıdır.
Gerçek stok bakiyesi hareketlerden türetilmelidir; kartela birincil kayıt kaynağıdır.

Production verisi değiştirilmedi.
