# FAZ 20 — Otomatik Test Runner

V20 ile iki katman eklendi:

1. Uygulama tarafında `finansSenaryolariniCalistir()` fonksiyonu.
2. Bağımsız Node smoke runner: `tests/finans-senaryo-runner.mjs`.

Test runner üretim verisine yazmaz.

## Önemli sınır
Bu runner şu anda senaryo beklentilerinin ve test altyapısının çalıştığını doğrular. Gerçek satış motorunu çalıştırıp gerçek çıktı üretmez. Gerçek E2E doğrulama için uygulama/Edge Function test ortamına bağlanmak gerekir.
