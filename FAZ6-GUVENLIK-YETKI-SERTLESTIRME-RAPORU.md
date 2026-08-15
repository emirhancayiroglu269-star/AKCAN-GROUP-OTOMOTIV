# FAZ 6 — Yetki / Güvenlik / Audit Sertleştirme

- Güvenlik odaklı kaynak dosyası: 9
- İncelenen istemci depolama/açık audit satırı adayı: 3

## Eklenenler
- `src/lib/guvenlik-politikasi.ts`: işlem bazlı merkezi istemci yetki kapısı.
- `src/lib/guvenlik-audit.ts`: gizli veri taşımadan normalize audit olayı.
- Kritik işlemler için yönetici onayı matrisi tanımlandı.

## Kritik güvenlik kuralı
Bu katman UI güvenliği içindir. Gerçek yetkilendirme Supabase RLS / Edge Function tarafında tekrar yapılmalıdır.
Yönetici PIN'i, parola veya yetki bilgisinin localStorage/sessionStorage üzerinden güvenlik kanıtı olarak kabul edilmemesi gerekir.

## Takip edilmesi gereken istemci depolama kullanımları
- `src/lib/yonetici-onay.ts:12` — `const kayitliPin = localStorage.getItem("akcan-yonetici-pin");`
- `src/lib/yonetici-onay.ts:18` — `localStorage.setItem("akcan-yonetici-pin", yeniPin.trim());`
- `src/lib/supabase.ts:14` — `const { method = "GET", body, token = localStorage.getItem(OTURUM_KEY) } = opts;`