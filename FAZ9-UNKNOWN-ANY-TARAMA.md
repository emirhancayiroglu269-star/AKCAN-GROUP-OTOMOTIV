# FAZ 9 — Unknown / Any Kaynak Taraması

Bu aşamada finansal çekirdeklerde toplu `any` -> tip dönüşümü yapılmadı; yanlış tip varsayımı finansal hesapları bozabilir.
Bunun yerine güvenli veri sınırı yardımcıları eklendi.

## En yoğun dosyalar
- `src/lib/finans-islem.ts` — any=32, unknown=0, non-null assertion=0
- `src/lib/satis-finans-motoru.ts` — any=22, unknown=0, non-null assertion=0
- `src/lib/gun-sonu-kapanis.ts` — any=20, unknown=0, non-null assertion=0
- `src/core/stok-analiz.ts` — any=11, unknown=0, non-null assertion=0
- `src/lib/donem-kapanis.ts` — any=10, unknown=0, non-null assertion=0
- `src/lib/audit-log.ts` — any=10, unknown=0, non-null assertion=0
- `src/lib/ters-islem-denetim.ts` — any=8, unknown=0, non-null assertion=0
- `src/lib/pos-mutabakat-motoru.ts` — any=8, unknown=0, non-null assertion=0
- `src/lib/uc-uca-mutabakat.ts` — any=7, unknown=0, non-null assertion=0
- `src/lib/yetki-denetim.ts` — any=6, unknown=0, non-null assertion=0
- `src/lib/cift-kayit-denetim.ts` — any=5, unknown=0, non-null assertion=0
- `src/lib/alis-finans-motoru.ts` — any=4, unknown=0, non-null assertion=0
- `src/lib/finans-tip-yardimcilari.ts` — any=0, unknown=4, non-null assertion=0
- `src/lib/supabase.ts` — any=2, unknown=0, non-null assertion=0
- `src/lib/guvenlik.ts` — any=2, unknown=0, non-null assertion=0
- `src/main.tsx` — any=0, unknown=2, non-null assertion=0
- `src/lib/tip-guvenli-hesap.ts` — any=0, unknown=2, non-null assertion=0
- `src/services/stok-service.ts` — any=1, unknown=0, non-null assertion=0
- `src/modules/alis/TedarikciSayfasi.tsx` — any=1, unknown=0, non-null assertion=0
- `src/lib/iade-iptal-butunluk.ts` — any=0, unknown=1, non-null assertion=0

## Sonraki güvenli refactor sırası
1. Finans motorlarının gerçek veri modelleri.
2. Satış/alış kayıt modelleri.
3. Stok hareket modeli.
4. Kasa/banka/cari hareket modelleri.
5. UI sayfalarındaki unknown kullanımları.

Amaç TypeScript'i susturmak değil; yanlış veri tipinin finansal kayda girmesini engellemek.