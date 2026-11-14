# V17 Faz 42 — Aylık / Dönem Sonu Kapanış

## Tamamlanan
Yeni `src/lib/donem-kapanis.ts` motoru eklendi.

### Dönem finans özeti
- KDV dahil satış cirosu
- İade
- Net ciro
- KDV
- KDV hariç net ciro
- SMM
- Brüt kâr
- POS komisyonu
- KDV hariç faaliyet gideri
- Net faaliyet kârı

Mevcut merkezi `donemKarOzetiHesapla` standardı kullanılıyor; yeni bir alternatif kâr hesabı oluşturulmadı.

### Dönem kapanış güvenliği
- Geçersiz tarih aralığı engellenir.
- Aynı dönem ikinci kez kapatılamaz.
- Kapalı günlerde MUTABIK olmayan kayıt varsa dönem kapanışı engellenir.
- Uçtan uca mutabakat, finans tutarlılığı, çift kayıt, ters işlem ve yetki denetimleri dönem kapanış kapısından geçirilir.
- Kapanışta dönem karşılaştırma verisi saklanır.

### Arayüz
`Finans > Gün Sonu > Dönem Kapanışı`

eklendi.

Ekranda:
- Net Ciro
- KDV Hariç Ciro
- SMM
- Brüt Kâr
- POS Komisyonu
- Faaliyet Gideri
- Net Faaliyet Kârı
- İade
- Önceki dönem karşılaştırması
- Kapanış bulguları
- MUTABIK durum etiketi
- Dönemi Kapat

gösteriliyor.

## Test
- İptal satış dönem hesabından çıkarılıyor → PASS
- Net ciro hesabı → PASS
- SMM → PASS
- Brüt kâr → PASS
- POS komisyonu → PASS
- Faaliyet gideri → PASS
- Net faaliyet kârı → PASS
- Dönem kapanış kontrolü → PASS
- MUTABIK kapanış kaydı → PASS
- Aynı dönem ikinci kapanış → ENGELLENDİ / PASS
- 95 TS/TSX → 0 diagnostic
- ZIP → PASS
