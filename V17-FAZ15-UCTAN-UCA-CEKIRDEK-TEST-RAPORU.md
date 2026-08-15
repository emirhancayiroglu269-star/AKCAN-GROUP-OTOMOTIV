# V17 Faz 15 — Uçtan Uca Finans/Stok Çekirdek Testi

## Test edilen gerçek motorlar
- `alis-finans-motoru.ts`
- `satis-finans-motoru.ts`
- `database.ts` içindeki `stokHareketiUygula`

## Sonuçlar
1. Alış faturası 100 TL, 40 TL ödeme:
   - Tedarikçi borcu net 60 TL: PASS
   - Kasa/banka çıkışı 40 TL: PASS
   - Aynı alış ID'sinin ikinci finans uygulaması engellendi: PASS

2. Satış 150 TL nakit:
   - Kasa/banka girişi 150 TL: PASS
   - Aynı satış ID'sinin ikinci finans uygulaması engellendi: PASS

3. Stok hareketi:
   - 10 → S1 satış 2 → 8: PASS
   - S1 aynı hareket tekrar → 8'de kaldı, ikinci hareket oluşmadı: PASS
   - S2 yeni belge → 6: PASS

## Not
Üretim `vite build` bu çalışma ortamında çalıştırılamadı; proje bağımlılıkları (`node_modules/.bin/vite`) ZIP içinde kurulu değil. Buna rağmen değiştirilen TypeScript kaynakları transpile edildi ve çekirdek finans/stok motorları gerçek kaynak kodundan izole edilerek test edildi.

Bu fazda yeni iş mantığı eklenmedi; mevcut merkezi motorların çift işlem ve temel bakiye etkileri doğrulandı.
