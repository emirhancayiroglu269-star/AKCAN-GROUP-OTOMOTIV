# FAZ 90 — Yetkilendirme / Rol / İşlem Onayı

ERP kullanıcı yetkileri ve kritik işlem onay altyapısı oluşturuldu.

## Roller
- Süper Admin
- Yönetici
- Satış
- Satın Alma
- Depo
- Kasa
- Muhasebe
- Rapor
- Sade Kullanıcı

## Yetki örnekleri
- Ürün gör/düzenle
- Fiyat değiştirme
- Satış oluşturma/iptal
- Alış oluşturma/onaylama
- Stok düzeltme
- Cari görüntüleme/limit değiştirme
- Tahsilat
- Kasa/banka işlemleri
- Rapor görüntüleme
- Kullanıcı/yetki yönetimi
- Finans onayı

## Kritik işlemler
Belirlenen eşiklerin üzerindeki fiyat override, yüksek tutarlı alış,
yüksek tutarlı iade, cari limit override ve kasa/banka düzeltmeleri onay
akışına gönderilebilir.

## Güvenlik
Yetki kontrolü yalnızca arayüzde değil, backend/domain işlem katmanında da
zorunlu olmalıdır. Kullanıcı pasifse hiçbir işlem yetkisi çalışmamalıdır.

Onay kayıtları kullanıcı, tarih, işlem, tutar, gerekçe ve sonuç ile audit
kaydına bağlanmalıdır.

Production verisi değiştirilmedi.
