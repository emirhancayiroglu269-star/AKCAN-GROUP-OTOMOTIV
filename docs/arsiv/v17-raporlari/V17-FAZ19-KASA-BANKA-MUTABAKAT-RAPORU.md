# V17 Faz 19 — Kasa/Banka Mutabakat Motoru

## Yapılan
Mevcut finans tutarlılık kontrolü genişletildi. Artık yalnızca hesap kartındaki kayıtlı bakiye ile son hareket bakiyesi karşılaştırılmıyor; kasa/banka hareketlerinin kendi zinciri de doğrulanıyor.

Hareketler yeni → eski tutulduğu için her hareket için:
`eski bakiye + giriş - çıkış = yeni hareketin bakiyeSonrasi`
kuralı kontrol ediliyor.

Bu kontrol:
- aradan silinen hareket,
- yanlış giriş/çıkış tutarı,
- yanlış bakiyeSonrasi,
- bozulmuş hareket sırası
gibi durumları yakalar.

Özet API ayrıca:
- hesap sayısı,
- aktif hesap sayısı,
- toplam kasa/banka bakiyesi,
- kontrol zamanı
alanlarını döndürüyor.

## Test
Sağlam zincir: 0 bulgu.
Bozuk zincir (90 TL hareketin 100 TL bakiye ile kaydedildiği örnek): 1 bulgu.

TypeScript transpile: PASS.
