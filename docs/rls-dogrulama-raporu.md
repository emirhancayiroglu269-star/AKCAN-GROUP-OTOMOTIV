# Supabase RLS migration doğrulaması

**Tarih:** 2026-02-20 · **Kapsam:** `supabase/migrations/` altındaki 4 SQL dosyası

## Kısa cevap

**Migration'lar production'a uygulanmamış — ve uygulanıp uygulanmadığını bu makineden doğrulayamıyorum.**
Proje referansı (`oungmlyniuwpoyfghvrz.supabase.co`) DNS'te **çözümlenmiyor**: böyle bir host yok.
Yani migration'ların durumu bir yana, uygulamanın kodda gömülü olan merkezi sunucu adresi
çalışmıyor.

## 1. Ne buldum

### Migration'lar kendileri "uygulanmadı" diyor

Dört dosyanın **dördü de** yorum satırında açıkça uyarıyor:

| Dosya | Kendi uyarısı |
|---|---|
| `20260813_faz30_rls_baslangic.sql` | "Bu migration **TASARIM/şablondur**. Production Supabase'e uygulanmadan önce gerçek tablo isimleri ve kolonlar mevcut şemayla eşleştirilmelidir." |
| `20260813_faz34_auth_profile.sql` | "Bu migration **şablondur**; production'a uygulanmadan önce doğrulanmalıdır." |
| `20260813_faz42_atomic_write_app_state.sql` | "**Production'a otomatik uygulanmaz.**" |
| `20260813_faz45_atomic_rpc_test.sql` | "**IMPORTANT: Production'a uygulanmamalıdır.** Yalnızca ayrı test projesi/branch için." |

Hiçbiri "uygulandı" demiyor; üçü açıkça "uygulanmamalı/uygulanmaz" diyor.

### Migration'ların hiçbir izi kodda yok

| Aranan | Sonuç |
|---|---|
| `supabase.rpc(...)` çağrısı | **0** |
| `atomic_write_app_state` kullanımı | **0** (yalnızca bir yorum satırında adı geçiyor) |
| `user_profiles` tablosu | **0** — uygulama bu tabloyu hiç okumuyor/yazmıyor |
| `current_user_role()` / `has_role()` | **0** |
| RLS politikasına bağımlı kod | **0** |

Yani migration'lar uygulansa bile **uygulama onları kullanmıyor**. Yetki kontrolü tamamen
istemci tarafında: `localStorage`'daki `db.kullanicilar` + `yetkiVarMi()`.

`src/lib/guvenlik-politikasi.ts:73` bunu kendisi itiraf ediyor:
> "Gerçek güvenlik Supabase RLS / Edge Function / server-side authorization üzerinde
> tekrar uygulanmalıdır. localStorage veya UI kontrolü tek başına yetki kanıtı olarak
> kullanılmamalıdır."

`src/lib/security/yetki-kapi.ts:15` de aynı şeyi söylüyor:
> "Gerçek yetki kaynağı server/RLS olmalıdır."

### Proje adresi ölü

```
nslookup oungmlyniuwpoyfghvrz.supabase.co
→ Non-existent domain

curl https://oungmlyniuwpoyfghvrz.supabase.co/rest/v1/
→ Could not resolve host
```

`src/lib/supabase.ts:6-7` bu adresi **koda gömülü fallback** olarak tutuyor:

```ts
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://oungmlyniuwpoyfghvrz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6mdoEyS-O79tqVm2AogJDA_buYLyv--";
```

`.env` dosyası repoda yok (`.gitignore`'da), `.env.example` da yok. Yani bu adres
**her kurulumda kullanılan tek adres** — override edilmiyor.

## 2. Neden bu makineden doğrulanamıyor

RLS'in uygulanıp uygulanmadığını görmenin üç yolu var; üçü de kapalı:

| Yol | Neden olmuyor |
|---|---|
| REST API ile `user_profiles` sorgulamak | Host çözümlenmiyor |
| `supabase` CLI (`supabase migration list`) | CLI kurulu değil, proje link'li değil (`supabase/.temp` yok, `config.toml` yok) |
| Supabase Dashboard | Servis anahtarı / hesap erişimi gerekiyor; bende yok |

Bu bir eksiklik değil, **bulgunun kendisi**: migration'ların uygulandığına dair hiçbir
kanıt yok, ve uygulamanın gerçekten bağlanacağı bir sunucu da yok.

## 3. Bu ne demek — risk tablosu

| Alan | Bugünkü durum | Risk |
|---|---|---|
| **Veri kalıcılığı** | Merkezi sunucu yok → her PC `localStorage`'da tutuyor | **Yüksek** — tarayıcı verisi silinirse tüm ERP verisi gider |
| **Çoklu kullanıcı** | Sunucu olmadığı için PC'ler arası senkron yok | **Yüksek** — iki kasa aynı stoğu satabilir |
| **Yetki kontrolü** | Tamamen istemci tarafı (`yetkiVarMi`) | **Yüksek** — tarayıcı konsolundan atlanabilir |
| **RLS** | Migration dosyaları var, uygulanmamış, kod kullanmıyor | Şu an **etkisiz** (uygulama o tablolara hiç dokunmuyor) |
| **Atomic write** | `atomic_write_app_state` var, çağrılmıyor | Eşzamanlı yazma çakışması korumasız |

## 4. Ne yapılmalı — sıralı

### Adım 1: Gerçek bir Supabase projesi belirle (senin yapman gereken)

Yeni proje aç → `Project URL` ve `anon/publishable key` al. Sonra `.env` dosyası oluştur:

```
VITE_SUPABASE_URL=https://<proje>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.env.example` dosyasını da repoya ekle (değerler boş, sadece isimler) — yeni kurulumda
ne girileceği görünsün.

**Bunu yapmadan hiçbir migration doğrulanamaz.** Proje adresini bana verirsen
Adım 2–3'ü ben yapabilirim.

### Adım 2: Migration'ları gerçek şemaya göre yeniden yaz

Mevcut dört dosya **şablon**. Gerçek durum:

- Uygulama verisi **tek bir `app_state` satırında JSON** olarak duruyor (`id='main'`, `data jsonb`).
  Ayrı `parcalar` / `satislar` / `cariler` tabloları **yok**.
- Bu yüzden `faz30`'daki "kritik tablolar için gerçek policy'ler" maddesi **uygulanamaz** —
  policy yazılacak tablo yok.
- `faz34`'ün `user_profiles` tablosu hiçbir yerde kullanılmıyor. Ya kullanılmalı ya silinmeli.
- `faz45` production'a **girmemeli** — ~~silinmeli veya `supabase/tests/` altına taşınmalı~~
  → **YAPILDI:** `supabase/tests/atomic_rpc_test.sql` altına taşındı. `migrations/`
  altından çıktığı için `supabase db push` artık onu görmez.

### Adım 3: İki gerçek karar

**Karar A — RLS'i ciddiye al.** `app_state` tek satır olduğu için RLS ile satır bazlı
yetki verilemez: ya tüm veriyi okur ya hiç okumaz. Gerçek çözüm:
`app_state`'i yalnızca `service_role`'a açmak, tüm yetki kontrolünü **Edge Function**
içinde yapmak (`merkeziIstek` zaten oradan geçiyor). Bu, `guvenlik-politikasi.ts`'in
"gerçek güvenlik Edge Function'da olmalı" notuyla da uyumlu.

**Karar B — Şimdilik tek kullanıcı kabul et.** Uygulama tek PC'de, tek kullanıcıyla
çalışacaksa Supabase'i tamamen bırak, veriyi şifreli bir dosyaya yaz. Daha az hareketli
parça, daha az kırılma noktası. Ama çoklu kullanıcı/senkron isteniyorsa A zorunlu.

## 4b. Uygulanan kararlar (2026-02-20)

### faz45 → `supabase/tests/` taşındı

`supabase db push` klasördeki *her* dosyayı uygular. Test amaçlı bir migration
`migrations/` altında durduğu sürece yanlışlıkla production'a girebilirdi.
`supabase/tests/atomic_rpc_test.sql` olarak taşındı; oradan otomatik hiçbir
yere gitmiyor, yalnızca elle çalıştırılır.

### faz34 → uygulanmayacak, dosya başında gerekçeli karar

`user_profiles` tablosu bugün **hiçbir yerde kullanılmıyor** (kodda sıfır referans).
Kullanılmayan bir tabloyu production'a eklemek güvenlik sağlamaz, saldırı yüzeyini
büyütür. Bu yüzden faz34'ün SQL'i **yorum içine alındı** — `db push` onu uygulamaz.

**Kararı verirken bulunan asıl sorun — bunu bilmen gerekiyor:**

> Şifreler `db.kullanicilar[].sifre` alanında **düz metin** saklanıyor. Hiçbir yerde
> hash yok.
>
> - `src/App.tsx:368` → `String(k.sifre || "") === temizSifre`
> - `src/lib/yonetici-onay.ts:29` → `k.sifre === sifre`
> - `src/modules/StokOperasyon.tsx:1358` → `sifreForm.eski !== aktifKullanici.sifre`
>
> Doğrulama tamamen istemcide, karşılaştırma düz metin üzerinden. `app_state`'i
> okuyabilen herkes **tüm kullanıcıların şifresini** görür. Bu, RLS eklenmesinden
> bağımsız olarak tek başına en büyük güvenlik açığı — ve RLS bunu **çözmez**,
> çünkü sorun şifrenin nerede durduğu değil, hiç hash'lenmemiş olması.

Doğru sıra: **önce** şifreler Supabase Auth'a taşınmalı (uygulama tablosunda şifre
kalmaz), **sonra** `user_profiles` yalnızca rol/izin taşımalı, **sonra** RLS anlamlı
olur. Bu sıra atlanırsa RLS eklenmiş ama şifreler hâlâ düz metin olur.

### faz30 → başına uygulama notu eklendi

`app_state` tek satır olduğu için satır bazlı RLS verilemez; gerçek çözüm
`service_role` + Edge Function içinde yetki kontrolü. Bu not dosyanın başına yazıldı.

### `supabase/README.md` eklendi

Hangi dosyanın uygulanacağı, hangisinin ertelendiği, hangisinin test olduğu tek
tabloda. Yeni migration eklerken uyulacak kural da orada.

## 5. Özet

Sorduğun soru: *"RLS migration'ları uygulanmış mı?"*

**Cevap: Hayır.** Dosyalar bunu kendileri söylüyor, kod hiç kullanmıyor, ve
uygulamanın bağlanacağı sunucu adresi DNS'te yok. Bu üçü birbirini doğruluyor —
yani "belki uygulanmıştır ama göremiyorum" değil, **uygulanmadığı kesin**.

En acil risk RLS değil: **merkezi sunucu yok**. Bugün bir PC'nin tarayıcı verisi
silinirse o PC'nin tüm ERP geçmişi gider.
