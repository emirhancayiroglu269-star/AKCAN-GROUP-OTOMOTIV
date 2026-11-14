# Dokümantasyon

Bu klasör projenin kalıcı belgelerini tutar. Geliştirme sürecinde üretilen geçici
faz raporları `docs/arsiv/` altında saklanır (silinmez, sadece kök dizini temiz
tutmak için taşınmıştır).

## Kalıcı Belgeler

| Dosya | İçerik |
|---|---|
| `MODULER-YAPISI.md` | Modül haritası: `src/modules/` altındaki her ekranın ne yaptığı ve `App.tsx` / `app-runtime` sorumluluk ayrımı |
| `MODULARIZASYON-RAPORU.json` | Runtime'dan dışa aktarılan sembollerin envanteri (modül bağımlılık referansı) |
| `V47-UCRETSIZ-MIMARI-ANAYASA.md` | Mimari ilkeler ve ücretsiz servis kullanımı kuralları |
| `V47-UCRETSIZ-SERVIS-MATRISI.md` | Hangi ihtiyaç için hangi (ücretsiz) servisin kullanıldığı |
| `V48-ERP-SAGLAMLASTIRMA-PLANI.md` | Sağlamlaştırma planı ve açık maddeler |

## Arşiv (`docs/arsiv/`)

Geliştirme boyunca üretilen ilerleme raporları. Tarihsel kayıt olarak tutulur;
güncel durum için **kaynak kod ve testler** esastır.

| Klasör | Dosya | Kapsam |
|---|---|---|
| `faz-raporlari/` | 154 | `FAZ2` – `FAZ153` arası modül geliştirme raporları |
| `v17-raporlari/` | 39 | V17 sürümünün `FAZ1` – `FAZ45` mutabakat ve regresyon raporları |
| `v32-v48-denetim/` | 13 | Supabase şema envanteri, RLS/Auth denetimi, atomik RPC geçiş durumu (JSON durum dosyaları dahil) |
| `eski-notlar/` | 18 | Sürüm notları, ayıklama/refactor raporları, tek seferlik `.txt` notlar |

## Yeni Belge Ekleme Kuralı

- Kalıcı değeri olan belge (mimari, kurulum, sözleşme) → doğrudan `docs/`
- Tek seferlik ilerleme/iş bitirme notu → `docs/arsiv/` altındaki uygun klasör
- Kök dizine **yalnızca** `README.md` ve yapılandırma dosyaları konur.
