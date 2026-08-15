# V17 Faz 39 — Yetki / İşlem Kilidi Son Kontrolü

## Amaç
Kritik işlemlerin yalnızca yetkili kullanıcı tarafından yapılmasını ve rol matrisinin bozulmasının Yönetici > Sistem Sağlığı ekranında fark edilebilmesini sağlamak.

## Uygulanan işlem kilitleri

- Satış kaydetme → `satisYapabilir`
- Mal alış kaydetme → `malAlisGirebilir`
- Müşteri tahsilatı → `tahsilatGirebilir`
- Tedarikçi ödeme → `kasaCikisiYapabilir`
- Satış iadesi → `iadeAlabilir`
- Alış iadesi → `malAlisGirebilir`
- Gider kaydetme → `kasaCikisiYapabilir`

Mevcut kritik kontroller de korunmuştur:

- Satış iptali → `satisIptalEdebilir` + gerektiğinde yönetici onayı
- Satış fiyatı değişimi → `satisFiyatiDegistirebilir`
- Maliyet/kâr görünürlüğü → ilgili yetkiler
- Stok düzeltme → `stokDuzeltebilir`
- Ürün silme → `urunSilebilir`
- Kullanıcı/yetki yönetimi → `kullaniciYonetebilir`

## Yeni Yetki Denetim Motoru

`src/lib/yetki-denetim.ts`

Salt-okuma olarak kontrol eder:

- Kritik yetki anahtarlarının rol üzerinde tanımlı olması
- Sabit rollerin beklenen görev matrisinin bozulması
- Aktif kullanıcının geçersiz bir role bağlanması
- Yönetici rolünün kullanıcı/yetki yönetimi yetkisinin kapatılması

## Yönetici entegrasyonu

`Yönetici > Sistem Sağlığı > Yetki / İşlem Kilidi`

kartı eklendi.

Bulgu oluşursa kullanıcı yönetimi ekranına yönlendirme yapılabilir.

## Kod doğrulama

- 94 TS/TSX dosyası → 0 transpile diagnostic
- Satış, alış, tahsilat/ödeme, iade ve gider handler'larında kritik yetki kilitleri mevcut
- Rol matrisi bozulması için denetim testi → PASS
- Geçersiz role bağlı kullanıcı testi → PASS
- ZIP bütünlük → PASS

## Sonuç

Kritik finans, stok ve satış işlemlerinde UI seviyesinde yetki kilitleri tamamlandı. Buna ek olarak rol matrisi artık Yönetici > Sistem Sağlığı üzerinden denetlenebiliyor.
