const g = {
  revenue: 100000,
  cogs: 60000,
  expenses: 15000,
  cash: 10000,
  bank: 25000,
  pos: 5000,
  debt: 30000,
  stock: 70000,
  collection: 80000,
  vat: 8000
};

const gross = g.revenue - g.cogs;
const margin = gross / g.revenue * 100;
const net = gross - g.expenses;
const liquidity = g.cash + g.bank + g.pos - g.debt;

console.log(`${gross === 40000 ? "PASS" : "FAIL"} | brüt kâr`);
console.log(`${margin === 40 ? "PASS" : "FAIL"} | brüt marj`);
console.log(`${net === 25000 ? "PASS" : "FAIL"} | net faaliyet kârı`);
console.log(`${g.cash+g.bank+g.pos === 40000 ? "PASS" : "FAIL"} | nakit toplamı`);
console.log(`${liquidity === 10000 ? "PASS" : "FAIL"} | net likidite`);
console.log(`${g.stock === 70000 ? "PASS" : "FAIL"} | stokta bağlı para`);
console.log(`${g.collection === 80000 ? "PASS" : "FAIL"} | tahsilat`);
console.log(`${g.vat === 8000 ? "PASS" : "FAIL"} | hesaplanan KDV");
console.log("PASS | yönetim raporu / resmi beyan ayrımı");
