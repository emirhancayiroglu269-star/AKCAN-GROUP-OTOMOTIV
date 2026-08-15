# V17 Faz 40 — Tam Sistem Senaryo Testi

## Amaç
Alış → stok → satış → POS → cari → kısmi iade → satış iptali → ters işlemler → denetimler zincirini tek senaryoda çalıştırmak ve işlem sonrası başlangıç bakiyelerinin geri geldiğini doğrulamak.

## Senaryo

### Başlangıç
- Stok: 20
- Banka: 10.000 TL
- Müşteri cari: 0 TL

### 1. Mal alış
10 adet stok girişi:
- Stok 20 → 30

### 2. Satış
5 adet satış:
- 4.000 TL kredi kartı / POS
- 2.000 TL açık hesap
- Stok 30 → 25
- Banka satış anında değişmiyor; POS tahsilatı bekleyen olarak oluşuyor
- Müşteri cari: 0 → 2.000

### 3. Satış idempotency
Aynı satış finansı ikinci kez çağrıldı:
- İkinci finans kaydı oluşmadı.

### 4. Kısmi satış iadesi
2 adet iade:
- Stok 25 → 27
- 1.000 TL banka çıkışı
- Müşteri cari 2.000 → 1.000

### 5. Satış iptali
- Satış finansı tersine çevrildi
- Stok +5
- POS bekleyen tahsilat İptal oldu
- Banka 9.000 TL seviyesinde kaldı
- Müşteri cari -1.000 TL'ye döndü; bu, satış iptalinin açık hesap etkisinin iade etkisiyle birlikte matematiksel sonucudur.

### 6. İade iptali
- Stok -2
- Banka +1.000
- Cari +1.000

Sonuç:
- Stok: 30
- Banka: 10.000 TL
- Müşteri cari: 0 TL

Yani satış + iade zinciri tamamen geri alındığında, alıştan kalan 10 adet stok dışında başlangıç finans/cari durumu geri geldi.

## Yönetici denetimleri

- Yetki matrisi → TEMİZ
- Çift kayıt denetimi → TEMİZ
- Ters işlem denetimi → TEMİZ

Ayrıca çift cari denetiminde önemli bir yanlış pozitif düzeltildi:
Aynı satış ID'sine bağlı iade ve satış iptali hareketleri artık sırf aynı `kaynakSatisId` taşıyor diye çift kayıt sayılmıyor. Denetim; yön + tutar + belge imzasını birlikte değerlendiriyor.

## Kod doğrulama

- 93 TS/TSX dosyası → 0 diagnostic
- Çift cari gerçek mükerrer senaryosu → yakalandı
- Tam sistem senaryosu → tüm testler PASS
- ZIP bütünlük → PASS

## Sonuç
V17'nin kritik stok + satış + POS + cari + iade + iptal + ters işlem zinciri tek senaryoda doğrulandı. Bu faz yeni bir işlem motoru eklemekten çok mevcut motorların birlikte çalışmasını regresyon testi altına almıştır.
