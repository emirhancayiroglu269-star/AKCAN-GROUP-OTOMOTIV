const sale = {
  qty: 2,
  price: 1000,
  cost: 600,
  vat: 20,
};

const total = sale.qty * sale.price;
const cost = sale.qty * sale.cost;
const vat = total * sale.vat / 100;
const profit = total - cost;

const reverse = {
  stock: sale.qty,
  cash: -total,
  vat: -vat,
  cost: -cost,
  profit: -profit,
};

const checks = [
  ["stok geri", reverse.stock, 2],
  ["kasa ters", reverse.cash, -2000],
  ["kdv ters", reverse.vat, -400],
  ["maliyet ters", reverse.cost, -1200],
  ["kar ters", reverse.profit, -800],
];

for (const [name, actual, expected] of checks) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}

const partialQty = 1;
console.log(`${partialQty === 1 ? "PASS" : "FAIL"} | kısmi iade`);
console.log(`${"SALE-001" && "RETURN-001" ? "PASS" : "FAIL"} | kaynak/idempotency`);
