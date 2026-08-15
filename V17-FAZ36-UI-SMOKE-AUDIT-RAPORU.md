# V17 Faz 36 — UI Smoke Audit / Gerçek Ekran Akış Kontrolü

## Amaç
Faz 35'te doğrulanan merkezi motorların gerçek ekranlara bağlandığı kritik kullanıcı akışlarını kaynak kod seviyesinde uçtan uca denetlemek.

## Kontrol edilen akışlar

### 1. Mal Alış
- Ürün/kalem akışı mevcut
- `kaydet` akışı mevcut
- `stokHareketiUygula` ile stok girişi yapılıyor
- Mükerrer belge uyarısı mevcut
- Alış sonrası maliyet/stok zinciri merkezi motora bağlanıyor

### 2. Satış / Kasa
- Ürün seçimi mevcut
- Birim fiyat değişimi akışı mevcut
- Ödeme alanı mevcut
- Satışı Tamamla akışı mevcut
- Stok hareketinde belgeNo/idempotency bağlantısı mevcut

### 3. İade
- Satış iadesi kaydetme akışı mevcut
- İade stok girişi mevcut
- Finans `islemKaydet` akışı mevcut
- İade sonrası ekran sonucu mevcut

### 4. Yönetici > Sistem Sağlığı
- Sistem Sağlığı sekmesi mevcut
- Hata detay paneli mevcut
- `İlgili Modüle Git` mevcut
- App `setSekme` bağlantısı mevcut

## Statik smoke sonuçları

Tüm kritik kontroller:
- PASS — 13/13

Kod doğrulama:
- 90 TS/TSX dosyası
- 0 TypeScript transpile diagnostic

## Önemli teknik not
Bu ZIP'in içinde `node_modules` yok. Bu nedenle burada gerçek Vite tarayıcı oturumu açıp fiziksel tıklama/DOM etkileşimi çalıştırmak yerine kaynak kod + merkezi motor regresyonu üzerinden UI smoke audit yapıldı.

Faz 35'in gerçek motor senaryosu da tekrar doğrulanmış durumda:
- alış +10
- satış -5
- kısmi iade +2
- mükerrer alış/iade engeli
- negatif stok engeli
- maliyet/kâr
- son mutabakat = temiz

## Sonuç
Kritik UI akışlarının merkezi motorlara bağlantısında statik smoke testi temizdir.
Bir sonraki adım gerçek browser E2E çalıştırma ortamı sağlandığında aynı senaryoları fiziksel tıklamalarla çalıştırmaktır.
