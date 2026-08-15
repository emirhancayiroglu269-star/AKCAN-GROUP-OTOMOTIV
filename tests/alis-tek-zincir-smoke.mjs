const items = [
  { qty: 4, price: 500, vat: 20 },
  { qty: 2, price: 250, vat: 20 },
];

const total = items.reduce((s, x) => s + x.qty * x.price, 0);
const vat = items.reduce((s, x) => s + x.qty * x.price * x.vat / 100, 0);
const stockIn = items.reduce((s, x) => s + x.qty, 0);

const checks = [
  ["toplam", total, 2500],
  ["kdv", vat, 500],
  ["stokGiris", stockIn, 6],
  ["kasaCikis", -total, -2500],
];

for (const [name, actual, expected] of checks) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}

const acikHesap = true;
const cari = acikHesap ? total : 0;
const kasa = acikHesap ? 0 : -total;

console.log(`${cari === 2500 ? "PASS" : "FAIL"} | tedarikçi cari`);
console.log(`${kasa === 0 ? "PASS" : "FAIL"} | açık hesap kasa`);
