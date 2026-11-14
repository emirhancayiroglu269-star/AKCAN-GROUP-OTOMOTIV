# V16 — app-runtime servis ayrıştırma turu

## Bu turda ayrıştırılan kümeler
- `src/services/satis-service.ts` — satış geçmişi ve kârlılık yardımcıları
- `src/services/stok-service.ts` — stok/satın alma/sipariş önerisi/tedarikçi fiyat karşılaştırması/ürün analiz yardımcıları
- `src/services/rapor-service.ts` — cari vade, nakit akışı, gün sonu, vardiya ve yönetim raporu yardımcıları

## Sonuç
- `src/app-runtime.tsx`: 2488 → 1868 satır
- Azalma: 620 satır
- Finans motoru (`src/lib/finans-islem.ts`) bu turda değiştirilmedi.
- Mevcut modüllerin `app-runtime` üzerinden kullandığı dış API'ler re-export edilerek korunmuştur.

## Kontroller
- Yeni servis dosyaları TypeScript parser/semantic kontrolünden geçirildi.
- Yeni servislerde yeni bir TypeScript hatası kalmadı.
- Proje genelindeki mevcut bağımlılık eksikliği nedeniyle gerçek Vite build bu ortamda çalıştırılamıyor.
- `node_modules` pakete dahil edilmedi.
