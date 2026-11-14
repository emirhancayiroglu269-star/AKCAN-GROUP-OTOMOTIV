# V17 Faz 38 — Veri Kurtarma / Ters İşlem Güvenlik Testi

## Amaç
Satış, tahsilat/ödeme ve stok işlemlerinin iptal/geri alma sırasında ilk finansal etkilerini güvenli şekilde tersine çevirdiğini ve ters kayıtların ikinci kez üretilemediğini doğrulamak.

## Gerçek çekirdek testleri

### Satış finansı
- Satış tahsilatı hesap bakiyesine işlendi → PASS
- Aynı satış finansı ikinci kez uygulanmadı → PASS
- Satış iptalinde hesap bakiyesi eski haline döndü → PASS
- Aynı satış iptali ikinci kez uygulanmadı → PASS

### Genel tahsilat/ödeme
- Tahsilat hesap bakiyesine işlendi → PASS
- Tahsilat iptali ters kayıt oluşturdu → PASS
- Tahsilat iptalinde hesap bakiyesi eski haline döndü → PASS
- Aynı tahsilat ikinci kez iptal edilemedi → PASS

### Stok
- Satış stok çıkışı → PASS
- Satış iptal stok geri girişi → PASS

## Yeni Ters İşlem Denetim Motoru

`src/lib/ters-islem-denetim.ts`

Salt-okuma olarak şunları kontrol eder:

- aynı orijinal işlem için birden fazla ters kayıt
- orijinali bulunmayan yetim ters kayıt
- ters kayıt varken orijinal işlemin `İptal Edildi` olmaması
- orijinalin ters kayıt ID'si ile gerçek ters kaydın uyuşmaması
- ters işlemin yönünün yanlış olması
- satış ters finans kaydı olup satış belgesinin iptal edilmemiş olması

## Yönetici entegrasyonu

`Yönetici > Sistem Sağlığı > Ters İşlem`

kartı eklendi.

Hatalar mevcut detay panelinden incelenebilir ve ilgili finans modülüne yönlendirilebilir.

## Teknik doğrulama

- 92 TS/TSX dosyası → 0 diagnostic
- Geçerli ters işlem → PASS
- Çift ters kayıt → YAKALANDI
- Yetim ters kayıt → YAKALANDI
- Ters yön hatası → YAKALANDI
- Eksik iptal durumu → YAKALANDI
- ZIP bütünlük → PASS

## Sonuç

İptal işlemleri artık sadece çalıştırılmakla kalmıyor; ters kayıtların bütünlüğü de yönetici seviyesinde denetlenebiliyor.
