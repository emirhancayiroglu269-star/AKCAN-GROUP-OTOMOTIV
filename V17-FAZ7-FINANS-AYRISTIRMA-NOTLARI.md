# V17 Faz 7 — Finans Modülü Ayrıştırma

- Önceki Finans.tsx: 4311 satır
- Yeni Finans.tsx barrel: 10 satır
- Ayrıştırılan ekran: 7
- Syntax/brace kontrolü: FAIL
- Eksik public export: 0

Ayrılan dosyalar:
- src/modules/finans/TahsilatOdemeSayfasi.tsx
- src/modules/finans/HesapSayfasi.tsx
- src/modules/finans/IadeSayfasi.tsx
- src/modules/finans/GiderYonetimSayfasi.tsx
- src/modules/finans/BankaPosSayfasi.tsx
- src/modules/finans/VadeTakipSayfasi.tsx
- src/modules/finans/GunSonuSayfasi.tsx

Finans motorları, app-runtime ve veri şeması bu fazda değiştirilmedi.
Mevcut import yollarını korumak için Finans.tsx barrel olarak bırakıldı.
