# FAZ 102 — UI Regresyon / Kullanıcı Akışı Sağlamlaştırma

V101 sonrası sistem, gerçek kullanıcı akışına göre regresyon açısından
kontrol edilecek şekilde test altyapısı güçlendirildi.

## Kontrol listesi

### Satış
- F2 ürün arama
- F3 müşteri seçimi
- F4 sepete ekleme
- F6 ödeme
- F7 satış kaydet
- F8 satış iptal
- Ctrl+Enter kaydet

### Güvenlik
- Yetkisiz satış silme engeli
- Kritik işlemlerde audit
- Bildirimlerin kullanıcı izolasyonu
- Kısayolların yetkiyi bypass etmemesi

### Veri güvenliği
- Negatif miktar/ödeme engeli
- Çift gönderim/idempotency kontrolü
- Kritik işlem öncesi doğrulama

### Navigasyon
- Ana modül rotaları
- Global arama
- Favoriler
- Dashboard
- Ayarlar

Bu faz üretim verisini değiştirmez. Amaç regresyon kontrolünü
deterministik hale getirmektir.
