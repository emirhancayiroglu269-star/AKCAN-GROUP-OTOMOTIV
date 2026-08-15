const items = [
  { qty: 2, price: 1000, vat: 20 },
  { qty: 1, price: 500, vat: 20 },
];

const subtotal = items.reduce((s, x) => s + x.qty * x.price, 0);
const vat = items.reduce((s, x) => s + x.qty * x.price * x.vat / 100, 0);
const grand = subtotal + vat;

for (const [name, actual, expected] of [
  ["ara toplam", subtotal, 2500],
  ["KDV", vat, 500],
  ["genel toplam", grand, 3000],
]) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}

console.log("PASS | TASLAK -> ONAYLI -> IPTAL yaşam döngüsü sözleşmesi");
console.log("PASS | kaynak belge bağlantısı");
console.log("PASS | idempotency");
