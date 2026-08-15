# V17 Faz 34 — Mutabakat Hata Detayı ve İlgili Modüle Git

## Amaç
Yönetici > Sistem Sağlığı ekranındaki bir hatanın sadece listelenmesi yerine incelenebilmesini ve ilgili modüle geçiş yapılabilmesini sağlamak.

## Yapılanlar

### 1. Hata satırları tıklanabilir
Stok, satış/ödeme, iade, kasa/banka, cari ve POS bulgularından birine tıklanınca detay paneli açılır.

### 2. Detay paneli
Panelde:
- kayıt ID'si
- hata açıklaması
- fark tutarı
- beklenen değer
- kayıtlı değer
- ilgili kayıt bulunabiliyorsa ad/açıklama
gösterilir.

### 3. İlgili modüle git
Hata tipine göre:
- Stok → `stok`
- Satış/Ödeme → `belgeler`
- İade → `iade`
- POS → `bankapos`
- Kasa/Banka → `kasayonetimi`
- Müşteri/Tedarikçi Cari → `cari`

sekmesine geçiş yapılır.

Bu navigasyon App'in mevcut `setSekme` mekanizmasını kullanır; yeni bir router veya ayrı navigasyon sistemi eklenmedi.

### 4. Güvenlik
Detay paneli salt-okumadır. Hata incelenirken herhangi bir stok, cari, kasa veya satış işlemi oluşturulmaz.

## Teknik doğrulama
- 90 TS/TSX dosyası → 0 diagnostic
- Detay seçimi → PASS
- İlgili modüle git → PASS
- App `setSekme` bağlantısı → PASS
- Stok yönlendirmesi → PASS
- ZIP bütünlük testi → PASS
