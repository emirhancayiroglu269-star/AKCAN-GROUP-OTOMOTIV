# Testler — AKCAN GROUP OTOMOTİV

## Durum özeti

| | Sayı | Uygulama kodunu çalıştırıyor mu? |
|---|---|---|
| `tests/gercek/*.test.ts` (**yeni**) | 6 dosya / **90 test** | ✅ Evet — `src/` import ediyor |
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

### `tests/gercek/stok-hareketi-sozlesmesi.test.ts` — 8 test
`src/lib/database.ts → StokHareketiSonucu`

- Dört durumun doğru raporlanması: `uygulandi` / `zaten-uygulandi` / `engellendi` / `parca-yok`
- Reddedilen durumlarda `db` referansının **değişmemesi**
- `stokHareketiDb` / `stokHareketiUygulandiMi` geriye dönük uyumluluk yardımcıları
- İdempotency anahtarının tür ve parça bazında ayrışması

### `tests/gercek/alis-zinciri.test.ts` — 10 test
`src/modules/alis/AlisSayfasi.tsx` (handleKaydet) + `src/lib/database.ts`

Alış kaydının çekirdek döngüsünün birebir kopyası üzerinde:
- Stok artışı + ağırlıklı ortalama (`10@10 + 10@20 = 15`)
- Sıfır stoktan başlayınca ortalama doğrudan alış fiyatı
- Çok kalemli alışta her ürünün kendi ortalaması
- Kısmi başarı yok: 2. kalem reddedilirse 1. kalem de geri alınır
- Aynı belge no idempotency (stok) — ve **bilinen açık** (maliyet)
- Ortalama maliyetin 2 ondalığa yuvarlanması

## Test yazarken bulunan 3 şüpheli davranış — İNCELENDİ ve DÜZELTİLDİ

Testler yazılırken beklenen ile gerçek üç yerde çelişti. Üçü de incelendi:

### 1. ✅ GERÇEK HATA — `agirlikliOrtalamaMaliyetHesapla` hiç alınmamış fiyatı maliyet yazıyordu
**Dosya:** `src/lib/maliyet.ts`

Toplam adet 0 olduğunda fonksiyon `yeniFiyat`'ı döndürüyordu. `yeniAdet: 0` geçen bir
çağrı, hiç alınmamış bir fiyatı ortalama maliyet olarak yazdırabiliyordu.

```diff
- if (toplamAdet <= 0) return yeniFiyat;
+ if (toplamAdet <= 0) return 0;
```

Ayrıca `yeniAdet` negatifse toplam adedi bozabiliyordu → `Math.max(0, yeniAdet || 0)`.
Test: `maliyet-kar.test.ts` — "hiç stok ve hiç alım yoksa 0 döner", "negatif yeniAdet…".

### 2. ✅ GERÇEK HATA — Alış kaydında "hayalet alış": stok reddedilse de maliyet yazılıyordu
**Dosya:** `src/modules/alis/AlisSayfasi.tsx` (handleKaydet döngüsü)

Sıra yanlıştı: ortalama maliyet ve alış geçmişi **önce** yazılıyor, stok hareketi
**sonra** uygulanıyordu. `stokHareketiUygula` `null` döndürdüğünde fonksiyon
`return prev` diyordu — ama döngü içinde `sonuc` üzerinden yapılan önceki
değişiklikler geri alınmıyordu ve bu kalemin alış geçmişi stok hareketi olmadan
maliyete giriyordu.

```diff
- const yeniOrtalama = ...;          // önce maliyet
- const guncellenmisParcalar = ...;   // önce geçmiş
- const yeni = stokHareketiUygula(...);
- if (!yeni) return prev;
+ const yeni = stokHareketiUygula(...);   // önce stok
+ if (!yeni) return prev;                 // reddedilirse hiçbir şey yazılmaz
+ const stokSonrasi = yeni.parcalar.find(...);
+ const yeniOrtalama = agirlikliOrtalamaMaliyetHesapla(stokSonrasi.stok - adet, ...);
+ sonuc = { ...yeni, parcalar: ... };      // sonra maliyet
```

Test: `alis-zinciri.test.ts` — 7 test, AlisSayfasi'nin döngüsünün birebir kopyası
üzerinde çalışır (stok, ortalama maliyet, alış geçmişi, kısmi iptal, idempotency).

### 3. ✅ SESSİZ HATA → artık gürültülü — tanımsız belge türü satış sayacını paylaşıyordu
**Dosya:** `src/lib/belge.ts`

`BELGE_TUR_ONEKLERI`'nde olmayan bir tür (örn. `"Alış Faturası"` — doğrusu `"Fatura"`)
sessizce `"ST"` önekine düşüyor ve **satış fişiyle aynı sayacı** paylaşıyordu.
`SatisSayfasi` bu listeyi `Secim` seçeneği olarak kullandığı için şu an UI'dan
tetiklenemiyor, ama servis/veri içe aktarma yolundan sessizce numara çakışması
üretebilirdi.

```diff
+ if (!onEk) {
+   onEk = "ST";
+   if (belgeTuru && !bilinmeyenBelgeTurleri.has(belgeTuru)) {
+     bilinmeyenBelgeTurleri.add(belgeTuru);
+     console.warn(`[belge] Tanımsız belge türü "${belgeTuru}" — "ST" öneki ve SATIŞ sayacı kullanılıyor.`);
+   }
+ }
```

Tür başına yalnızca **bir kez** uyarır (konsol spam'i yok). Önek tablosu
değiştirilmedi — `"Alış Faturası"` gibi bir türü tabloya eklemek veri kararıdır,
kod kararı değil. Test: `belge-numaralandirma.test.ts` — 3 yeni test.

## 4. ✅ GERÇEK HATA — aynı belge no ile alış MALİYETİ bozuyordu (kapatıldı)

**Dosyalar:** `src/lib/database.ts`, `src/modules/alis/AlisSayfasi.tsx`,
`src/modules/alis/SatinAlmaSiparisiSayfasi.tsx`, `src/modules/Stok.tsx`

`stokHareketiUygula` idempotentti (aynı belge no ile stok ikinci kez artmıyordu)
ama **db döndürdüğü için** çağıran taraf "hareket reddedildi" ile "uygulandı"yı
ayırt edemiyordu. Sonuç: stok artmadan ortalama maliyet ve alış geçmişi yazılıyordu.

```
10 adet @10 stokta, 10 adet @20 alındı → ortalama 15 ✅
aynı belge no ile tekrar → stok 20 ✅, ortalama 17.5 ❌
```

**Çözüm — açık bir dönüş sözleşmesi:**

```ts
export type StokHareketiSonucu =
  | { durum: "uygulandi";          db: any }
  | { durum: "zaten-uygulandi";    db: any }
  | { durum: "engellendi";         db: any }
  | { durum: "parca-yok";          db: any };
```

`db` her durumda dolu (engellendiğinde değişmemiş db) — eski `null` dönüşü yok.
Geriye dönük uyumluluk için `stokHareketiDb()` ve `stokHareketiUygulandiMi()`
yardımcıları eklendi.

Maliyet/geçmiş yazan üç yer artık sıralamayı doğru yapıyor ve `zaten-uygulandi`
durumunda **tamamen atlıyor**:

| Dosya | Önce | Sonra |
|---|---|---|
| `AlisSayfasi.tsx` | maliyet → stok | stok → (kabul) → maliyet, `zaten-uygulandi` → `continue` |
| `SatinAlmaSiparisiSayfasi.tsx` | maliyet → stok | stok → (kabul) → maliyet, `zaten-uygulandi` → `return` |
| `Stok.tsx` (stok giriş modalı) | maliyet → stok, `\|\| {...}` ile sessiz geri dönüş | stok → (kabul) → maliyet + kullanıcıya uyarı |

Diğer 9 çağrı noktası (`SatisSayfasi` ×4, `IadeSayfasi` ×3, `BelgelerSayfasi` ×2,
`MusteriSiparisiSayfasi`, `RezervSayfasi`) yalnızca `.db` alacak şekilde güncellendi;
stok dışında yan veri yazmadıkları için `zaten-uygulandi` kontrolü gerekmiyor.

**Testler:** `stok-hareketi-sozlesmesi.test.ts` (8 test — dört durum + yardımcılar +
idempotency anahtarı), `alis-zinciri.test.ts` (10 test — çift kayıtta maliyet 15'te
kalıyor, farklı miktarda gerçekten uygulanıyor).

## Sıradaki adımlar (öneri)

1. `src/lib/finans-islem.ts` (`finansIslemDogrula`, `finansIslemiUygula`) için test —
   para hareketi, en kritik ikinci motor.
3. `src/lib/fiyatlandirma.ts` (kampanya, müşteri özel fiyat, iskonto sırası) testi.
4. `src/lib/audit-log.ts` hash zinciri testi (kayıt değiştirilirse zincir kopmalı).
5. Eski 118 `.mjs` dosyasını `tests/eski-smoke/` altına taşı ve README'de
   "gerçek test değil" notunu koru.
