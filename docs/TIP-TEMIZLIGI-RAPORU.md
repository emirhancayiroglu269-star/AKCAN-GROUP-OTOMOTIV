# AKCAN GROUP OTOMOTİV — TypeScript Tip Temizliği Raporu

**Tarih:** 2026-02-14
**Başlangıç:** 835 tip hatası (47 dosya)
**Şu an:** **0 tip hatası** — %100 temiz
**Build:** `npm run build` ✅ başarılı (Vite 8, 1703 modül)
**tsconfig:** `strict: true` (aşamalı — aşağıya bakın)

---

## 1. Kök neden: eksik `@types/react`

Projede `react` ve `react-dom` kuruluydu ama **`@types/react` yoktu**. Bu yüzden:

- `React.ButtonHTMLAttributes`, `React.InputHTMLAttributes`, `React.SelectHTMLAttributes` boş nesne olarak çözümleniyordu
- `ButonProps`, `GirdiProps`, `SecimProps` içindeki `extends` hiçbir şey getirmiyordu
- `onClick`, `value`, `type`, `disabled`, `key`, `children` gibi **tüm standart DOM prop'ları tanınmıyordu**
- 599 hatanın (TS2322) tek başına en büyük kaynağı buydu

**Yapılan:** `@types/react@18.3.12` + `@types/react-dom@18.3.1` devDependency olarak eklendi.

> **Tek bu düzeltme 835 → 387 hataya indirdi.** Yani hataların yarısı tek bir eksik paketten geliyordu.

---

## 2. Yapılan düzeltmeler

### Altyapı / yapılandırma

| Dosya | Değişiklik |
|---|---|
| `package.json` | `@types/react`, `@types/react-dom` eklendi |
| `src/vite-env.d.ts` | **Yeni dosya** — `import.meta.env`, `*.css`, `*.png` modül tipleri |

### `src/components/ui.tsx` — ortak bileşen tipleri

| Değişiklik | Gerekçe |
|---|---|
| `BosProps.ikon`: `React.ComponentType<{size?, style?}>` → `React.ComponentType<any>` | lucide-react ikonları `LucideProps` alıyor, dar tip uyumsuzdu (152 hata) |
| `SecimProps`'e `hint?: React.ReactNode` eklendi + render'a yansıtıldı | `Secim` çağrılarında `hint` kullanılıyordu ama tipinde yoktu |
| `RozetTone` tipi `export` edildi | Başka dosyalarda `RozetTone` olarak kullanılıyordu |

### Tip güvenliği (gerçek hata yakalayan düzeltmeler)

| Dosya | Değişiklik |
|---|---|
| `src/lib/domain/urun-stok-karti.ts` | `alternatifKodlari` → `alternatifKodlar` (yazım hatası, alan **hiç okunmuyordu**) |
| `src/lib/security/yetki-kapi.ts` | `require(...)` → statik `import` (ESM/Vite uyumlu; `require` tarayıcıda çalışmaz) |
| `src/modules/Stok.tsx` | `bugun()` → `R.bugun()` (2 yerde **tanımsız fonksiyon** çağrılıyordu) |
| `src/modules/Stok.tsx` | `bosForm.kdvOrani` artık `string` — input değeriyle tutarlı |
| `src/modules/raporlar/RaporlarSayfasi.tsx` | 8 rapor bileşeni için **eksik import** eklendi |
| `src/modules/satis/TekliflerSayfasi.tsx` | `TopluFiyatListesi` için **eksik import** eklendi |
| `src/modules/Yonetim.tsx`, `FiyatKurallariSayfasi.tsx`, `finans/*` | `T.ink700` → `T.ink900` (temada **olmayan** renk anahtarı) |
| `src/core/runtime-utils.ts` | `fotografSikistir` → `Promise<string>` dönüş tipi |

### `unknown` / `{}` kaynaklı hatalar

| Dosya | Değişiklik |
|---|---|
| 11 dosya | `const harita = {}` → `Record<string, any>` (11 yer) |
| `RaporUrunPerformansi`, `TedarikciKarsilastirmaSayfasi`, `Stok` | Toplama haritalarına açık `Record<...>` tipi |
| 18 dosya | `[...new Set(x.map(...).filter(Boolean))]` → `new Set<string>(...) as string[]` |
| `Stok.tsx` | `Array.from(e.target.files)` → `Array.from<File>(...)` |
| `Stok.tsx` | `new window.BarcodeDetector(...)` → `(window as any).BarcodeDetector` |
| `stok-service.ts` | `urunTedarikciKarsilastirmasi` dönüş tipi `TedarikciKarsilastirmaSatiri[]` olarak tanımlandı |

### Tarih aritmetiği (TS2362 / TS2363)

`new Date(a) - new Date(b)` TypeScript'te geçersiz (Date üzerinde `-` yok). 30 yerde
`Number(new Date(a)) - Number(new Date(b))` yapıldı — **çalışma zamanı davranışı aynı**,
artık tip güvenli.

### Eksik nesne alanları

| Dosya | Eklenti |
|---|---|
| `SatisSayfasi`, `MusteriSiparisiSayfasi`, `RezervSayfasi` | `satis.belgeNo` alanı tanıma eklendi |
| `SatisSayfasi` | `odemeSatirlari` tipi `posId?: string` ile tanımlandı |
| `Yonetim.tsx` | `veriler: Record<string, any>` |
| `AnaSayfa.tsx` | `AlTabButon` `sayi` varsayılanı; `kutu` `ton` varsayılanı |
| `GunSonuSayfasi` | `kutu` `ton` varsayılanı |
| `Stok.tsx` | `oluFiltre: number \| string` |

### `FileReader` sonuçları

`ev.target.result` tipi `string | ArrayBuffer | null`. String bekleyen 9 yerde
`String(ev.target.result ?? "")` sarmalaması yapıldı.

---

## 3. Son tur: 30 → 0

| Dosya | Düzeltme |
|---|---|
| `App.tsx` | `document.activeElement as HTMLElement` (isContentEditable) |
| `lib/constants.ts` | `sonuc as "Başarılı" \| "Reddedildi" \| "Hata"` |
| `modules/Stok.tsx` | `setForm({ ...R.bosForm, ... })`, `tone as any` |
| `pages/AracSayfasi.tsx` | `Set<string>` + `filter(Boolean)` |
| `pages/OluStokSayfasi.tsx` | `new Date(x).getTime()` |
| `pages/FiyatKurallariSayfasi.tsx` | `tone as any` |
| `modules/raporlar/RaporPersonel.tsx` | `personeller: string[]` |
| `modules/finans/GunSonuSayfasi.tsx` | `donem1/donem2` → gerçek `ciro.g1` / `ciro.g2` (alan adları yanlıştı) |
| `modules/finans/GiderYonetimSayfasi.tsx` | `bosGiderKayitForm.kdvOrani` → `"20"` (input değeri string) |
| `modules/finans/IadeSayfasi.tsx` | `kapatmaYontemi` dar birleşim → `String()` karşılaştırma |
| `modules/finans/TahsilatOdemeSayfasi.tsx` | `FinansYon` / `FinansIslemGirdisi` tipleri, `faturaTahsisleri` `Record<string, string \| number>` |
| `modules/satis/SatisSayfasi.tsx` | `e.target as HTMLInputElement` |
| `modules/satis/TekliflerSayfasi.tsx` | `durumDegistir(t, "…", "")` (3. argüman) |
| `modules/alis/AlisSayfasi.tsx` | `form.hesapId` → `form.odemeHesapId` (olmayan alan) |
| `core/urun-form.ts` | `export type UrunFormu` |
| `core/akcan-runtime.tsx` | `bosGiderKayitForm.kdvOrani` string |

**Sonuç:** `npx tsc -p tsconfig.json --noEmit` → **0 hata**. `npm run build` ✅ 1.89s.

## 4. `strict: true` geçişi

`strict: true` açıldı. Açıldığında **3746 hata** çıktı. Bunların **%79'u tek bir bayraktan** geliyordu:

| Bayrak | Hata | Payı |
|---|---|---|
| `noImplicitAny` (TS7006 + TS7031) | 2963 | %79 |
| `strictNullChecks` (TS18047 + TS18048 + TS2531 + TS2532) | 184 | %5 |
| gerçek tip hataları (TS2339/2345/2322/…) | ~599 | %16 |

### Neden `noImplicitAny` açılmadı

2963 hatanın neredeyse tamamı **fonksiyon parametresi / destructuring** kaynaklı:

```ts
// TS7006 örneği
const satirlar = db.parcalar.map((p) => p.ad);   // 'p' implicitly has an 'any' type
const { ad, kod } = kayit;                        // TS7031 binding element implicitly 'any'
```

Bunlar **tip hatası değil, tip eksikliği**. Hepsini düzeltmek `db` şemasının (Parca, Cari,
Tedarikci, Satis, Hesap, Kampanya, Vardiya, Audit… ~30 varlık) uçtan uca tiplenmesi demek.
Bu, tek oturumda güvenle yapılabilecek bir iş değil: yanlış varsayılan tip, çalışan bir akışı
sessizce bozabilir. Ayrı bir iş olarak, modül modül ilerlemeli.

### Yapılan: aşamalı strict

`strict: true` bırakıldı; `noImplicitAny` ve `strictNullChecks` bilinçli olarak `false`'a
çekildi. Bu, TypeScript'in **tüm diğer strict bayraklarını** açık tutar:

| Bayrak | Durum |
|---|---|
| `strictFunctionTypes` | ✅ açık |
| `strictBindCallApply` | ✅ açık |
| `strictPropertyInitialization` | ✅ açık |
| `useUnknownInCatchVariables` | ✅ açık |
| `alwaysStrict` | ✅ açık |
| `noImplicitThis` | ✅ açık |
| `noImplicitAny` | ⏸ sonraki aşama |
| `strictNullChecks` | ⏸ sonraki aşama |

Bu profil açıldığında çıkan **5 hata** düzeltildi:

| Dosya | Düzeltme |
|---|---|
| `App.tsx` (5 nokta) | `catch (e)` → `catch (e: any)` — `e?.status === 409` erişimi `unknown`'da geçersizdi |

Sonuç: **0 hata**, build ✅.

## 5. Varlık (entity) tipleri — `src/lib/domain/entity-types.ts`

`noImplicitAny`'yi açabilmenin ön koşulu `db` şemasının tiplenmesiydi. **Yeni dosya:**
`src/lib/domain/entity-types.ts` (~640 satır, sıfır çalışma zamanı maliyeti — sadece tip).

### Tanımlanan tipler

| Grup | Tipler |
|---|---|
| Takma adlar | `Para`, `Fiyat`, `Kimlik`, `ZamanDamgasi`, `IsoGun` |
| Ürün | `Parca`, `BarkodKaydi`, `AlisGecmisiKaydi`, `FiyatGecmisiKaydi`, `DepoStogu`, `SetBileseni`, `PaketBirimi` |
| Cari | `Cari`, `CariHareket`, `Tedarikci`, `TedarikciHareket` |
| Satış | `Satis`, `SatisKalemi`, `OdemeSatiri`, `EFaturaBilgisi` |
| Stok | `StokHareketi` |
| Finans | `Hesap`, `KasaIslemi`, `PosCihazi` |
| Satın alma | `MalAlimi`, `SatinAlmaSiparisi` |
| Depo | `Depo`, `Transfer` |
| Tanım | `Kategori`, `Marka`, `Arac`, `Uyumluluk` |
| Vardiya | `Vardiya`, `GunSonu` |
| Yetki | `Rol`, `Kullanici`, `IslemGecmisiKaydi`, `AuditGecmisiKaydi` |
| Fiyat | `MusteriFiyatGrubu`, `FiyatGrubuKurali`, `Kampanya`, `Teklif`, `TeklifKalemi` |
| Sipariş | `Rezerv`, `MusteriSiparisi`, `Iade` |
| Kök | `VeriTabani` (60 koleksiyon, `bosVeritabani()` şemasıyla birebir) |

### Tasarım kararları

1. **Bilinçli `optional`** — gerçekte her kayıtta olan alanlar zorunlu (`stok`, `ad`,
   `satisFiyati`…), eski kayıtlarda bulunmayanlar `?` (`barkodlar`, `depoStoklari`,
   `fiyatGecmisi`…). Tip şemayı yalan söylemiyor.
2. **`[anahtar: string]: any` index signature** her arayüzde var — geçiş sırasında mevcut
   dinamik erişimleri kırmıyor, kademeli sıkılaştırmaya izin veriyor.
3. **Ad çakışması yok** — dosya yeni, hiçbir mevcut dosya bunu import etmiyor.
   `erp-domain-models.ts` (Fransızca adlandırılmış, kullanılmayan) yerine geçmek üzere
   hazır ama devreye alınmadı.
4. `bosVeritabani()` şemasıyla **birebir**: 60 koleksiyonun tamamı `VeriTabani` içinde.

### `noImplicitAny` denemesi

Tipler yazıldıktan sonra `noImplicitAny: true` açılıp ölçüldü: **3197 hata** kaldı
(2963'ten 234 azalma). Kalanların dağılımı:

| Kod | Hata | Ne demek |
|---|---|---|
| TS7006 | 2599 | Fonksiyon parametresi tipsiz — **`db` değil**, `(e)`, `(p)`, `(k)`, `(x)` gibi yerel callback'ler |
| TS7031 | 297 | Destructuring binding tipsiz — `const { ad, kod } = kayit` |
| TS7053 | 121 | `obj[anahtar]` — index signature yok |
| TS7018 | 84 | Nesne literal alanı `null`/`undefined`'dan `any` çıkarımı |
| TS7005/7034/7011 | 23 | Değişken / nesne / fonksiyon tipsiz |

**Yani kalan iş `db` tiplendirmesi değil, 3000+ yerel callback parametresinin
tiplenmesi.** Bu, dosya dosya elle yapılması gereken bir iş (~75 dosya); tek oturumda
güvenle tamamlanamaz. `noImplicitAny` bu yüzden **kapalı bırakıldı** — açık bırakılsaydı
`npm run typecheck` sürekli kırmızı olur ve sinyal değerini yitirirdi.

### Devreye alma planı (öneri)

1. `VeriTabani` tipini `database.ts`'teki `bosVeritabani()` dönüşüne bağla:
   `export const bosVeritabani = (): VeriTabani => ({ ... })`
2. `db` alan bir yardımcı fonksiyon imzasına `db: VeriTabani` yaz (yukarıdaki 70 imza
   zaten `db: any` ile işaretlendi — bunlar `db: VeriTabani`'ye çevrilebilir).
3. Ekranları tek tek `noImplicitAny` ile derle (dosya bazlı `// @ts-check` benzeri
   aşamalı geçiş), callback parametrelerini tiple.
4. 75 dosya bitince `noImplicitAny: true`.

