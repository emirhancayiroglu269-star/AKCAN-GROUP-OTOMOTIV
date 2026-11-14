// Eski .mjs smoke testlerini sırayla çalıştırır.
// Kabuk (bash/cmd) sözdizimine bağlı kalmadan Windows/Linux/macOS'ta çalışır —
// `for f in tests/*.mjs` cmd.exe'de hata veriyordu (CI'da da aynı risk).
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const kok = join(dirname(fileURLToPath(import.meta.url)));

// Bu betiğin kendisi ve başka yardımcı betikler çalıştırılmasın.
const HARIC = new Set(["eski-smoke-calistir.mjs"]);

const dosyalar = readdirSync(kok)
  .filter((f) => f.endsWith(".mjs") && !HARIC.has(f))
  .sort();

let basarili = 0;
let basarisiz = 0;
const hatalar = [];

for (const dosya of dosyalar) {
  const sonuc = spawnSync(process.execPath, [join(kok, dosya)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (sonuc.status === 0) {
    basarili++;
  } else {
    basarisiz++;
    hatalar.push({ dosya, kod: sonuc.status, stderr: (sonuc.stderr || "").trim().split("\n").slice(-3).join(" | ") });
  }
}

console.log(`eski smoke testler: ${basarili} geçti, ${basarisiz} başarısız (toplam ${dosyalar.length})`);
if (basarisiz > 0) {
  console.log("\nBaşarısız dosyalar:");
  for (const h of hatalar) console.log(`  - ${h.dosya} (çıkış ${h.kod}) ${h.stderr}`);
  process.exit(1);
}
