# FAZ 45 — Gerçek Kullanım / E2E Test Sonuçları

## Senaryo 1 — Nakit satış
Müşteri + stok + kasa zinciri test edildi.
- Stok 10 → 9
- Kasa 1.000 → 1.500
- PASS

## Senaryo 2 — Karma satış
2 adet ürün:
- 400 TL açık hesap
- 600 TL kredi kartı/POS
- Stok 9 → 7
- Cari 0 → 400
- POS bekleyen tahsilat 600 TL oluştu
- PASS

## Senaryo 3 — Idempotency
Aynı satış finans motoruna ikinci kez gönderildi.
- İkinci finans kaydı oluşturulmadı.
- PASS

## Senaryo 4 — Satış iptali
Karma satış terslendi.
- Cari 400 → 0
- POS bekleyen tahsilat İptal
- Stok 7 → 9
- PASS

## Senaryo 5 — Tüm zincirin geri alınması
İlk satış da terslendi.
- Stok 9 → 10
- Kasa 1.500 → 1.000
- Finans tutarlılığı: PASS
- Ters işlem denetimi: PASS

## Senaryo 6 — Müşteri silme regresyonu
Müşteri modülünün kaynak akışı doğrulandı:
- Aktif müşteri sil → PASİF
- Geçmiş satış/cari kayıtları korunur
- Pasif müşteri tekrar sil → açık borç varsa engelle
- Borç kapalıysa kalıcı sil
- Kalıcı silmeden sonra aynı isimle yeni aktif müşteri açılabilir
- PASS (kaynak/regresyon kontrolü)

## Sonuç
Satış → stok → kasa → cari → POS → iptal zinciri uçtan uca çalışıyor.
