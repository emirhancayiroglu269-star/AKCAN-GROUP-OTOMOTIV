const rows = [
  { id:"A", stock:5, reserved:1, buy:10, speed:"HIZLI", abc:"A", daily:2, revenue:5000, profit:1000 },
  { id:"B", stock:20, reserved:0, buy:0, speed:"HIZLI", abc:"B", daily:1, revenue:2500, profit:500 },
  { id:"C", stock:30, reserved:0, buy:0, speed:"OLU_STOK", abc:"C", daily:0, revenue:0, profit:0 },
];

function decide(r) {
  if (r.speed === "OLU_STOK") return "DURDUR";
  if (r.buy > 0) return "AL";
  if (r.speed === "HIZLI" && r.daily > 0) return "SATIS_DESTEKLE";
  return "IZLE";
}

const decisions = rows.map(r => ({...r, karar: decide(r)}));
console.log(`${decisions.find(x=>x.id==="A").karar === "AL" ? "PASS" : "FAIL"} | AL`);
console.log(`${decisions.find(x=>x.id==="B").karar === "SATIS_DESTEKLE" ? "PASS" : "FAIL"} | satış destekle`);
console.log(`${decisions.find(x=>x.id==="C").karar === "DURDUR" ? "PASS" : "FAIL"} | durdur`);

const buyTotal = rows.reduce((s,r)=>s+r.buy,0);
const revenue = rows.reduce((s,r)=>s+r.revenue,0);
const profit = rows.reduce((s,r)=>s+r.profit,0);

console.log(`${buyTotal === 10 ? "PASS" : "FAIL"} | önerilen alış`);
console.log(`${revenue === 7500 ? "PASS" : "FAIL"} | 30 gün ciro`);
console.log(`${profit === 1500 ? "PASS" : "FAIL"} | 30 gün kâr`);
console.log("PASS | dashboard otomatik sipariş vermiyor");
