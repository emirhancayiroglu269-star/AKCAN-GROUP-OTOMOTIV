# Testler — AKCAN GROUP OTOMOTİV

## Durum özeti

| | Sayı | Uygulama kodunu çalıştırıyor mu? |
|---|---|---|
| `tests/gercek/*.test.ts` (**yeni**) | 4 dosya / **68 test** | ✅ Evet — `src/` import ediyor |
| `tests/*.mjs` (eski "smoke") | 118 dosya | ❌ **Hayır** |

### Eski smoke testler hakkında uyarı

`tests/*.mjs` altındaki 118 dosyanın **hiçbiri** (`0/118`) uygulama kodunu import
etmiyor. Hepsi kendi içinde sabit sayılarla işlem yapıp `console.log("PASS")` basıyor:

```js
// tests/stok-motoru-smoke.mjs — GERÇEK test DEĞİL
let stock = 10;
stock += rules.ALIS * 5;
stock += rules.SATIS * 3;
console.log(`${stock === expected ? "PASS" : "FAIL"} | alış/satış/iade | ${stock}`);
```

`src/lib/database.ts` içindeki `stokHareketiUygula` bu test sırasında hiç çağrılmıyor.
Yani bu testler yeşil yansa da **hiçbir regresyonu yakalayamaz**.

Bu dosyalar **silinmedi** (geçmiş ve senaryo listesi değerli). Yeni gerçek testler
`tests/gercek/` altında ayrı yaşıyor ve `npm test` yalnızca onları çalıştırıyor.

## Komutlar

```bash
npm test              # gerçek testler (vitest run)
npm run test:watch    # izleyerek geliştirme
npm run test:gercek   # yalnızca tests/gercek
npm run test:eski-smoke   # eski .mjs dosyalarını çalıştırır (bilgi amaçlı)
```

`vitest.config.ts` eski `.mjs` dosyalarını bilinçli olarak `exclude` eder.

## Kapsam

### `tests/gercek/belge-numaralandirma.test.ts` — 12 test
`src/lib/belge.ts`

- İlk numara `000001`, artış sırası, 50 ardışık numaranın **tekil** olması
- Farklı belge türlerinin **ayrı sayaç** kullanması
- 6 hane taşması (`999999` → `1000000`, sıfır dolgusu bozulmuyor)
- `db.ayarlar.belgeOnekleri` özel önekinin önceliği
- Sayaç güncellemesinin **immutable** olması, diğer sayaçları bozmaması
- `satisBelgeNoGoster` geriye dönük uyumluluk (belgeNo yoksa id'nin son 6 hanesi)

### `tests/gercek/stok-hareketi.test.ts` — 14 test
`src/lib/database.ts → stokHareketiUygula` (sistemin **tek** stok değiştirme yolu)

- Giriş/çıkış, hareket kaydının doğru alanları (`kalanStok` dahil)
- **Ondalık yuvarlama**: `1 + 0.1 + 0.2 = 1.3` (kayan nokta artığı yok)
- `depoStoklari` dağılımının toplamla eşit kalması
- **Negatif stok koruması**: izin kapalıyken `null`, tam sıfıra düşürmek serbest
- **Idempotency**: aynı belge + aynı miktar ikinci kez uygulanmıyor; farklı miktar uygulanıyor
- Immutability (girdi `db` değişmiyor), yeni hareketin listenin başına eklenmesi
- 3 kalemli satışta biri yetmezse `null` ve **diğer kalemlerin dokunulmadan kalması**

### `tests/gercek/maliyet-kar.test.ts` — 21 test
`src/lib/maliyet.ts`

- Ağırlıklı ortalama maliyet (30@10 + 10@20 = 12.5), sıfıra bölme/NaN koruması
- `gecerliMaliyet` yöntem seçimi (`agirlikliOrtalama` / `sonAlis`) ve geri düşme zinciri
- **KDV zemini**: satış KDV dahil, maliyet hariç → `120 / 1.20 = 100`
- `markup` (25) ile `margin` (20) farkının karıştırılmaması
- Satır kârı, iskonto etkisi, maliyet 0'da `karYuzde: null`, zararına satış, `adet: 0`

### `tests/gercek/cari.test.ts` — 22 test
`src/services/rapor-service.ts`

- `satisAcikHesapKalan`: nakit/açık hesap ayrımı, kısmi tahsilat, 2 ondalık yuvarlama, fazla tahsilatta negatif
- `vadeGrubuBul`: geçmiş/gelecek ayrımı, deterministik
- `musteriAcikFaturalariFifo`: iptal atlama, **FIFO sıralama**, müşteri izolasyonu, isimle eşleşme (harf duyarsız), tahsilat havuzunun faturalara eskiden yeniye dağıtılması, fazla tahsilatın taşmaması, `vadeGunu` ile vade tarihi türetimi

## Test yazarken ortaya çıkan davranışlar (dokümante edildi)

Testler yazılırken üç yerde **beklenen ile gerçek çelişti**; kod değiştirilmedi,
test mevcut davranışı belgeliyor. Bunlar gözden geçirilmeli:

1. **`agirlikliOrtalamaMaliyetHesapla(0, 0, 0, 99)` → `99` döner.**
   Toplam adet 0 olduğunda formül bölme yapamayıp `yeniFiyat`'ı döndürüyor.
   "Stok yoksa maliyet 0 olmalı" beklentisiyle çelişir — çağıran taraf `yeniAdet: 0`
   geçmemeli.

2. **`belgeOnekleri`'nde olmayan belge türü sessizce `ST` önekine düşer.**
   `"Alış Faturası"` `BELGE_TUR_ONEKLERI`'nde yok; `"Fatura"` (FT) var. Yanlış tür adı
   kullanılırsa satış ve alış faturaları **aynı `ST-` sayacını** paylaşır. Sessiz hata.

3. **`satisKalemiKarBilgisi`'nde `iskontoTutari` adet başına değil, toplam gibi işleniyor.**
   `(adet × fiyat − iskonto) / adet` formülü, alan `iskontoTutari` (toplam) adını taşısa da
   toplam gibi davranıyor. Alanı adet başına iskonto olarak geçen bir çağrı varsa kâr
   yanlış hesaplanır.

## Sıradaki adımlar (öneri)

1. Yukarıdaki 3 davranışı gözden geçir; gerçekten hata ise düzelt ve testi güncelle.
2. `src/lib/finans-islem.ts` (`finansIslemDogrula`, `finansIslemiUygula`) için test —
   para hareketi, en kritik ikinci motor.
3. `src/lib/fiyatlandirma.ts` (kampanya, müşteri özel fiyat, iskonto sırası) testi.
4. `src/lib/audit-log.ts` hash zinciri testi (kayıt değiştirilirse zincir kopmalı).
5. Eski 118 `.mjs` dosyasını `tests/eski-smoke/` altına taşı ve README'de
   "gerçek test değil" notunu koru.
