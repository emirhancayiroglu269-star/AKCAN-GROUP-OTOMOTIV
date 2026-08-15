const sale = {
  tip: "SATIS", qty: 2, total: 2000, cost: 1200, vat: 400, payment: "NAKIT"
};
const saleEffect = {
  stok: -sale.qty,
  kasa: sale.total,
  kdv: sale.vat,
  maliyet: sale.cost,
  brutKar: sale.total - sale.cost
};

const returnEffect = {
  stok: 2,
  kasa: -2000,
  kdv: -400,
  maliyet: -1200,
  brutKar: -800
};

for (const [name, actual, expected] of [
  ["satış stok", saleEffect.stok, -2],
  ["satış kasa", saleEffect.kasa, 2000],
  ["satış kdv", saleEffect.kdv, 400],
  ["satış maliyet", saleEffect.maliyet, 1200],
  ["satış kar", saleEffect.brutKar, 800],
  ["iade stok", returnEffect.stok, 2],
  ["iade kasa", returnEffect.kasa, -2000],
  ["iade kdv", returnEffect.kdv, -400],
  ["iade maliyet", returnEffect.maliyet, -1200],
  ["iade kar", returnEffect.brutKar, -800],
]) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}`);
  if (!ok) process.exitCode = 1;
}

const roundTrip = {
  stok: saleEffect.stok + returnEffect.stok,
  kasa: saleEffect.kasa + returnEffect.kasa,
  kdv: saleEffect.kdv + returnEffect.kdv,
  maliyet: saleEffect.maliyet + returnEffect.maliyet,
  brutKar: saleEffect.brutKar + returnEffect.brutKar
};

for (const [name, value] of Object.entries(roundTrip)) {
  const ok = value === 0;
  console.log(`${ok ? "PASS" : "FAIL"} | round-trip ${name} = ${value}`);
  if (!ok) process.exitCode = 1;
}
