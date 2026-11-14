# V17 Faz 20 — POS / Banka Mutabakat Motoru

## Yapılan
POS mutabakat mantığı `BankaPosSayfasi.tsx` içinden çıkarılıp merkezi `src/lib/pos-mutabakat-motoru.ts` dosyasına alındı.

## Kurallar
- Sadece aktif ve `Bekliyor` durumundaki POS tahsilatı eşleştirilebilir.
- POS'un bağlı aktif banka hesabı zorunludur.
- Gerçek banka geçiş tutarı pozitif olmalıdır.
- Banka hareketi `pos:{tahsilatId}:mutabakat` kaynak anahtarıyla oluşturulur.
- Aynı POS tahsilatı ikinci kez bankaya geçirilemez.
- Orijinal POS tahsilatı silinmez; `gercekTutar`, `durum`, `mutabakatFarki`, `bankaHareketId` alanlarıyla izlenir.
- Beklenen net tutar ile gerçek banka geçişi farklıysa `Fark Var` olarak saklanır.
- POS komisyonu mutabakatta tekrar banka gideri gibi düşülmez; banka hesabına yalnızca gerçek geçen tutar girilir.

## Test
1000 TL satış, 30 TL komisyon, 970 TL banka geçişi:
- banka bakiye 1000 → 1970: PASS
- POS durumu Eşleşti: PASS
- fark 0: PASS
- 1 banka hareketi: PASS
- ikinci mutabakat engellendi: PASS

TypeScript transpile:
- `pos-mutabakat-motoru.ts`: PASS
- `app-runtime.tsx`: PASS
- `BankaPosSayfasi.tsx`: PASS
