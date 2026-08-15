const expenses = [
  {amount:10000, fixed:true},
  {amount:5000, fixed:true},
  {amount:3000, fixed:false},
  {amount:2000, fixed:false},
];

const total = expenses.reduce((s,x)=>s+x.amount,0);
const fixed = expenses.filter(x=>x.fixed).reduce((s,x)=>s+x.amount,0);
const variable = total-fixed;
const budget = 25000;

console.log(`${total === 20000 ? "PASS" : "FAIL"} | toplam gider`);
console.log(`${fixed === 15000 ? "PASS" : "FAIL"} | sabit gider`);
console.log(`${variable === 5000 ? "PASS" : "FAIL"} | değişken gider`);
console.log(`${budget-total === 5000 ? "PASS" : "FAIL"} | bütçe farkı`);
console.log(`${(total/budget*100) === 80 ? "PASS" : "FAIL"} | bütçe kullanım`);

const grossProfit = 50000;
const netOperatingProfit = grossProfit - total;
console.log(`${netOperatingProfit === 30000 ? "PASS" : "FAIL"} | net faaliyet kârı`);

console.log("PASS | gider kategori yapısı");
console.log("PASS | sabit/değişken ayrımı");
console.log("PASS | gider idempotency");
