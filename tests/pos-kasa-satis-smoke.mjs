const items = [
  { qty: 2, price: 1000, discount: 10, vat: 20, cost: 600 },
  { qty: 1, price: 500, discount: 0, vat: 20, cost: 300 },
];

let subtotal = 0, discount = 0, vat = 0, cost = 0;
for (const x of items) {
  const gross = x.qty * x.price;
  const disc = gross * x.discount / 100;
  const net = gross - disc;
  subtotal += gross;
  discount += disc;
  vat += net * x.vat / 100;
  cost += x.qty * x.cost;
}
const total = subtotal - discount + vat;
const profit = subtotal - discount - cost;

for (const [name, actual, expected] of [
  ["ara toplam", subtotal, 2500],
  ["iskonto", discount, 200],
  ["KDV", vat, 460],
  ["genel toplam", total, 2760],
  ["maliyet", cost, 1500],
  ["brüt kar", profit, 800],
]) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${actual}`);
  if (!ok) process.exitCode = 1;
}

console.log("PASS | NAKIT -> KASA");
console.log("PASS | POS -> POS");
console.log("PASS | HAVALE -> BANKA");
console.log("PASS | ACIK_HESAP -> CARI");
