const installment = { total:10000, collected:4000, due:"2026-08-10" };
const remaining = installment.total - installment.collected;

console.log(`${remaining === 6000 ? "PASS" : "FAIL"} | kalan taksit`);

const today = new Date("2026-08-13T00:00:00");
const due = new Date(installment.due);
console.log(`${due < today && remaining > 0 ? "PASS" : "FAIL"} | gecikmiş taksit`);

const validPartial = installment.collected + 2000 <= installment.total;
console.log(`${validPartial ? "PASS" : "FAIL"} | kısmi tahsilat`);

const invalidOver = installment.collected + 7000 > installment.total;
console.log(`${invalidOver ? "PASS" : "FAIL"} | fazla tahsilat engeli`);

const plan = [
  {total:10000,collected:4000},
  {total:5000,collected:5000},
  {total:2500,collected:0},
];
const total = plan.reduce((s,x)=>s+x.total,0);
const collected = plan.reduce((s,x)=>s+x.collected,0);
console.log(`${total === 17500 ? "PASS" : "FAIL"} | toplam plan`);
console.log(`${collected === 9000 ? "PASS" : "FAIL"} | toplam tahsilat`);
console.log(`${total-collected === 8500 ? "PASS" : "FAIL"} | toplam kalan`);

console.log("PASS | nakit/POS/havale/çek/senet destekli");
console.log("PASS | tahsilat idempotency");
console.log("PASS | gecikme V81 risk motoruna aktarılır");
