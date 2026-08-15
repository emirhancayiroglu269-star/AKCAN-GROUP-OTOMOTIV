const items = [
  { qty: 2, price: 1000, cost: 600, vat: 20 },
  { qty: 1, price: 500, cost: 300, vat: 20 },
];

const total = items.reduce((s, x) => s + x.qty * x.price, 0);
const cost = items.reduce((s, x) => s + x.qty * x.cost, 0);
const vat = items.reduce((s, x) => s + x.qty * x.price * x.vat / 100, 0);
const profit = total - cost;
const stockOut = -items.reduce((s, x) => s + x.qty, 0);

const checks = [
  ["toplam", total, 2500],
  ["maliyet", cost, 1500],
  ["kdv", vat, 500],
  ["brutKar", profit, 1000],
  ["stok", stockOut, -3],
];

for (const [name, actual, expected] of checks) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}

const nakit = true;
const kasa = nakit ? total : 0;
const cari = nakit ? 0 : total;

console.log(`${kasa === 2500 ? "PASS" : "FAIL"} | kasa`);
console.log(`${cari === 0 ? "PASS" : "FAIL"} | cari`);
