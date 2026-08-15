# FAZ 5 — İade / İptal / Stok / Finans Bütünlük Denetimi

Bu aşamada mevcut iade/iptal motorlarının muhasebe mantığı rastgele değiştirilmedi.
Önce ters hareketler için ortak bir invariant kontrolü eklendi.

## Kontrol edilen kaynaklar
- `src/core/stok-analiz.ts` — 183 satır; iade=18, iptal=1, stok=16, finans=0
- `src/lib/finans-islem.ts` — 444 satır; iade=24, iptal=10, stok=0, finans=31
- `src/lib/olu-stok.ts` — 85 satır; iade=23, iptal=5, stok=10, finans=0
- `src/lib/satis-finans-motoru.ts` — 187 satır; iade=13, iptal=6, stok=1, finans=20
- `src/lib/stok-performans.ts` — 70 satır; iade=8, iptal=2, stok=12, finans=0
- `src/modules/Stok.tsx` — 4992 satır; iade=147, iptal=1, stok=115, finans=17
- `src/modules/StokOperasyon.tsx` — 1639 satır; iade=45, iptal=10, stok=9, finans=2
- `src/modules/finans/IadeSayfasi.tsx` — 888 satır; iade=58, iptal=1, stok=3, finans=3
- `src/modules/raporlar/RaporStok.tsx` — 290 satır; iade=2, iptal=0, stok=26, finans=0
- `src/pages/OluStokSayfasi.tsx` — 342 satır; iade=11, iptal=0, stok=24, finans=0
- `src/pages/StokDevirHiziSayfasi.tsx` — 296 satır; iade=1, iptal=0, stok=10, finans=0
- `src/services/stok-service.ts` — 421 satır; iade=28, iptal=5, stok=35, finans=5

## Eklenen koruma
- `src/lib/iade-iptal-butunluk.ts` eklendi.
- İade/iptal tutarı, stok geri girişi ve finans geri dönüşü 0,01 TL toleransla karşılaştırılabiliyor.
- Negatif ters hareket tutarları engelleniyor.
- Uyuşmazlık varsa yan etki öncesi işlem durdurulabilecek şekilde `ok=false` döndürülüyor.

## Üretim notu
Bu kontrol muhasebe kaydı oluşturmaz. Gerçek atomiklik için Supabase/PostgreSQL transaction + unique/idempotency constraint ayrıca uygulanmalıdır.