const initial = { stok: 100, kasa: 50000, cari: 0, kdv: 0, maliyet: 0, brutKar: 0 };
const change = { stok: -10, kasa: 12000, cari: 0, kdv: 2000, maliyet: 7000, brutKar: 3000 };

const next = {
  stok: initial.stok + change.stok,
  kasa: initial.kasa + change.kasa,
  cari: initial.cari + change.cari,
  kdv: initial.kdv + change.kdv,
  maliyet: initial.maliyet + change.maliyet,
  brutKar: initial.brutKar + change.brutKar,
};

const expected = { stok: 90, kasa: 62000, cari: 0, kdv: 2000, maliyet: 7000, brutKar: 3000 };

for (const key of Object.keys(expected)) {
  const ok = next[key] === expected[key];
  console.log(`${ok ? "PASS" : "FAIL"} | ${key} | beklenen=${expected[key]} gerçek=${next[key]}`);
  if (!ok) process.exitCode = 1;
}

const duplicate = { ...next };
const duplicateAppliedTwice = {
  stok: duplicate.stok + change.stok,
  kasa: duplicate.kasa + change.kasa,
};
if (duplicateAppliedTwice.stok === next.stok || duplicateAppliedTwice.kasa === next.kasa) {
  console.error("FAIL | duplicate simulation");
  process.exitCode = 1;
} else {
  console.log("PASS | duplicate işlem farklı sonuç üretiyor; idempotency katmanı bunu engellemelidir");
}
