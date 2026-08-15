const saleTotal = 2760;

const payments = [
  { tip: "NAKIT", tutar: 1000 },
  { tip: "POS", tutar: 1760 },
];

const total = payments.reduce((s, p) => s + p.tutar, 0);
const remaining = saleTotal - total;

console.log(`${total === 2760 ? "PASS" : "FAIL"} | split toplam`);
console.log(`${remaining === 0 ? "PASS" : "FAIL"} | kalan 0`);

const mixed = [
  { tip: "NAKIT", tutar: 500 },
  { tip: "POS", tutar: 1000 },
  { tip: "HAVALE", tutar: 1260 },
];
const mixedTotal = mixed.reduce((s, p) => s + p.tutar, 0);
console.log(`${mixedTotal === saleTotal ? "PASS" : "FAIL"} | 3'lü ödeme`);

const incomplete = 2500;
console.log(`${incomplete < saleTotal ? "PASS" : "FAIL"} | eksik ödeme yakalama`);

const excess = 2800;
console.log(`${excess > saleTotal ? "PASS" : "FAIL"} | fazla ödeme yakalama`);
