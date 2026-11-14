# AKCAN GROUP OTOMOTİV — TypeScript Tip Temizliği Raporu

**Tarih:** 2026-02-14
**Başlangıç:** 835 tip hatası (47 dosya)
**Şu an:** **0 tip hatası** — %100 temiz
**Build:** `npm run build` ✅ başarılı (Vite 8, 1703 modül)

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

## 4. Önemli not

`tsconfig.json` içinde `strict: false`. Yani hâlâ **null kontrolü, implicit any,
fonksiyon parametreleri** denetlenmiyor. `strict: true` açıldığında yeni hatalar
çıkacaktır — bu ayrı bir iş olarak planlanmalı.

`npm run typecheck` script'i (`tsc -p tsconfig.json --noEmit`) artık anlamlı bir sinyal
veriyor; CI'a eklenebilir (önce kalan 30 hata kapatılmalı).
