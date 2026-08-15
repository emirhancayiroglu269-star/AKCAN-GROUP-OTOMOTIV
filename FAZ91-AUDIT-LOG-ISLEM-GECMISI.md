# FAZ 91 — Audit Log / İşlem Geçmişi

Kritik işlemlerin kim, ne zaman, hangi modülde ve hangi kayıt üzerinde yapıldığı izlenebilir.

## İzlenenler
- Oluşturma, güncelleme, silme
- Onay, red, iptal
- Tahsilat, ödeme, transfer
- Fiyat değişikliği
- Stok düzeltmesi
- Giriş / çıkış

## Kayıt
Kullanıcı, rol, işlem, modül, kaynak ID, açıklama, sonuç, tarih, session/correlation ID
ve önceki/yeni değerler tutulabilir.

## Güvenlik
Şifre, token, API anahtarı, kart numarası ve CVV gibi hassas bilgiler redakte edilir.
Audit kayıtları normal kullanıcı tarafından silinmemeli veya değiştirilmemelidir.
Düzeltmeler yeni audit olayı olarak kaydedilmelidir.

Production verisi değiştirilmedi.
