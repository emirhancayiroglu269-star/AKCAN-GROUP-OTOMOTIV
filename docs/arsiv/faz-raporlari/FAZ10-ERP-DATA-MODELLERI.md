# FAZ 10 — ERP Veri Modelleri

Satış, ödeme, stok, cari, kasa/banka ve iade hareketleri için ortak domain modelleri eklendi.
Bu modeller mevcut modülleri zorla değiştirmeden, sonraki refactorlarda kullanılacak güvenli sözleşmeyi oluşturur.

## İncelenen mevcut tip tanımları
- `src/lib/alis-finans-motoru.ts:4` — export type AlisFinansGirdisi = {
- `src/lib/satis-finans-motoru.ts:4` — export type SatisOdemeSatiri = {
- `src/lib/satis-finans-motoru.ts:11` — export type SatisFinansGirdisi = {
- `src/lib/satis-finans-motoru.ts:20` — export type SatisFinansSonucu = {
- `src/lib/finans-islem.ts:4` — export type FinansYon = "tahsilat" | "odeme";

## Refactor sırası
1. satis-finans-motoru.ts → SatisKaydi/OdemeHareketi
2. finans-islem.ts → CariHareketi/KasaBankaHareketi
3. stok motorları → StokHareketi
4. iade/iptal motorları → IadeKaydi
5. UI katmanı → domain modellerinden türetilmiş ekran tipleri