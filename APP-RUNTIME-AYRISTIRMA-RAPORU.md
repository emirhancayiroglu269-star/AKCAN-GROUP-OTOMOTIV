# App Runtime Ayrıştırma Raporu

Tarih: 2026-08-11

## Sonuç

`src/app-runtime.tsx` 2946 satırdan **2495 satıra** indirildi.

Finans çekirdeği (`src/lib/finans-islem.ts`) bu refactor sırasında değiştirilmedi.

## Ayrıştırılan çekirdekler

- `src/core/aktarim.ts` — CSV/Excel aktarım alanları ve doküman türleri
- `src/core/satin-alma.ts` — satın alma siparişi durumları ve toplam hesapları
- `src/core/tedarikci-cari.ts` — alış/tedarikçi formları, tedarikçi cari ve vade yardımcıları
- `src/core/musteri-siparis.ts` — müşteri siparişi durumları ve favoriler
- `src/core/urun-form.ts` — ürün kartı başlangıç formu
- `src/core/stok-analiz.ts` — stok sayım/değerleme ve fiyat hedefi yardımcıları
- `src/core/teklif-teslimat.ts` — teklif ve teslimat yardımcıları
- `src/core/bildirim-config.ts` — entegrasyon/bildirim yapılandırmaları

## Kontroller

- ZIP arşivi bütünlük kontrolü: başarılı
- Ayrıştırılan `src/core/*.ts` dosyaları TypeScript kaynak taramasında kendi dosya kaynaklı hata üretmiyor.
- Tam proje build'i bağımlılıkların npm registry'den indirilememesi nedeniyle bu ortamda çalıştırılamadı.
- `src/lib/finans-islem.ts` değiştirilmedi.

## Sonraki adım

Kalan `app-runtime.tsx` içindeki büyük işlev kümeleri daha kontrollü şekilde:

1. `core/stok.ts`
2. `core/satis.ts`
3. `core/musteri.ts`
4. `core/rapor.ts`
5. `core/ui-runtime.tsx`

olarak ayrıştırılabilir. Her aşamadan sonra TypeScript kontrolü yapılmalıdır.
