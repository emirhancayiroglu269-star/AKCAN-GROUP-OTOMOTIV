import { defineConfig } from "vitest/config";

// Gerçek testler yalnızca tests/gercek altında çalışır.
// tests/*.mjs dosyaları eski "sahte" smoke testlerdir (uygulama kodunu import
// etmezler) — vitest bunları toplamasın diye exclude edildi.
export default defineConfig({
  test: {
    include: ["tests/gercek/**/*.test.ts"],
    exclude: ["node_modules/**", "tests/*.mjs"],
    environment: "node",
  },
});
