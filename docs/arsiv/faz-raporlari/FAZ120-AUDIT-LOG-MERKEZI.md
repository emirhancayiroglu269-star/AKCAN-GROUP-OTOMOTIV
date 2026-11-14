# FAZ 120 — Audit Log & İşlem Geçmişi Merkezi

ERP'deki kritik işlemlerin geriye dönük izlenebilmesi için merkezi audit modeli
oluşturuldu.

## Her kayıtta
- Kim yaptı
- İşlem
- Modül / ekran
- İlgili kayıt
- Eski değer
- Yeni değer
- Tarih / saat
- Cihaz
- IP
- Sonuç
- Referans işlem

## İzlenen işlemler
Giriş, çıkış, oluşturma, güncelleme, silme, onay, iade, tahsilat, ödeme ve
fiyat değişikliği.

## Arama
Kullanıcı, modül, ekran, kayıt ID veya referans ID üzerinden geçmiş aranabilir.

## Veri bütünlüğü
Her kritik işlem referansı için idempotency anahtarı kullanılmalıdır.
Audit kayıtları silinmemeli; gerekiyorsa düzeltme işlemi yeni bir audit kaydı
oluşturmalıdır.

Production verisi değiştirilmedi.
