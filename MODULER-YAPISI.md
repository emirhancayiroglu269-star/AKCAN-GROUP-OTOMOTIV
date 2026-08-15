# V16 Modüler Yapı

`src/App.tsx` artık yalnızca uygulama orkestrasyonunu, global state/senkronizasyonu ve route/sekmeleri yönetir.

## Modüller
- `src/modules/Stok.tsx` — stok, hızlı arama, sipariş önerileri, sayım, toplu fiyat
- `src/modules/Satis.tsx` — satış, müşteri siparişi, teklifler
- `src/modules/AlisTedarikci.tsx` — mal alış, tedarikçiler, tedarikçi detayları, satın alma siparişleri, tedarikçi karşılaştırma
- `src/modules/Musteri.tsx` — müşteri ve müşteri detay
- `src/modules/Finans.tsx` — tahsilat/ödeme, kasa-hesap, iadeler, gider, POS/banka, vade, gün sonu
- `src/modules/Raporlar.tsx` — rapor merkezi ve alt raporlar
- `src/modules/StokOperasyon.tsx` — stok transferi, kargo, etiket, yedek/güvenlik
- `src/modules/Yonetim.tsx` — kullanıcı, ayarlar, iç/dış aktarım, entegrasyonlar, dış bildirimler
- `src/modules/AnaSayfa.tsx` — ana sayfa, yönetici paneli, stok analiz merkezi
- `src/modules/Giris.tsx` — ilk kurulum ve giriş

## Ortak çalışma alanı
`src/app-runtime.tsx`, daha önce `App.tsx` içinde duran ortak yardımcı fonksiyonları, sabitleri, UI bileşenlerini ve ortak importları barındırır. Böylece sayfa modülleri birbirinden bağımsız kalırken ortak iş kurallarını aynı kaynaktan kullanır.

## Kontrol
- `App.tsx`: 26.568 satırdan yaklaşık 1.031 satıra indirildi.
- Modül dosyaları ayrı tutuldu.
- Kaynakların TypeScript/TSX sözdizimi parse kontrolü yapıldı: **46 dosya, 0 syntax hatası**.
- `node_modules` ZIP'e dahil edilmedi; kurulum `npm install` ile yapılmalıdır.
