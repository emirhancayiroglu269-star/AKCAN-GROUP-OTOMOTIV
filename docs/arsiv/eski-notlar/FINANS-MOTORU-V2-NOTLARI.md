# Finans İşlem Motoru V2

## Yapılanlar
- `src/lib/finans-islem.ts` eklendi.
- Tahsilat/ödeme için ortak doğrulama ve transaction uygulama noktası oluşturuldu.
- Kasa/banka dağılımı toplam işlem tutarına eşit olmak zorunda.
- Tedarikçi ödemesi cari borcu aşamaz.
- Ödeme hesabında yetersiz bakiye engellenir.
- Aynı finans işlem ID'sinin ikinci kez uygulanması engellenir (idempotency).
- Cari hareket, kasa/banka hareketi, fatura tahsisi ve `kasaIslemleri` kaydı tek updateDb callback'i içinde oluşturulur.
- `finansTutarlilikKontrolu` ile müşteri, tedarikçi, kasa/banka bakiyesi ve yetim/çift finans işlem kayıtları kontrol edilir.
- Finans > Hesaplar ekranına tutarlılık kontrol paneli eklendi.
- Eski `Finans.tsx` ödeme kaydetme akışı ortak finans motorunu kullanacak şekilde refactor edildi.
- `cari-kasa.ts` finans hareketi parametreleri opsiyonel alanlarla uyumlu hale getirildi.

## Test
- 68 TS/TSX dosyası transpile/syntax kontrolü: 0 hata.
- Finans motoru smoke test: 4/4 başarılı.
- Transaction idempotency testi başarılı.
- Fazla tedarikçi ödeme testi başarılı.
- Kasa bakiyesi ve tedarikçi cari bakiyesi birlikte doğru güncelleniyor.
- Tutarlılık kontrolü temiz test verisinde 0 bulgu verdi.

## Not
Tam `npm run build` için proje bağımlılıkları gereklidir. Bu çalışma ortamında npm registry paketi indirilemediği için tam Vite build testi çalıştırılamadı.
