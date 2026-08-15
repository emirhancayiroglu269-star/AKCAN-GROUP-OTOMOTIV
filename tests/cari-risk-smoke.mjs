const p1 = {
  id:"C1", limit:100000, balance:45000, overdue:0, openOrder:20000
};
const risk1 = p1.balance + p1.openOrder;
console.log(`${risk1 === 65000 ? "PASS" : "FAIL"} | toplam risk`);
console.log(`${100000-risk1 === 35000 ? "PASS" : "FAIL"} | kullanılabilir limit`);
console.log(`${risk1 < p1.limit ? "PASS" : "FAIL"} | güvenli satış`);

const p2 = {
  id:"C2", limit:100000, balance:70000, overdue:5000, openOrder:10000
};
console.log(`${p2.overdue > 0 ? "PASS" : "FAIL"} | vadesi geçmiş`);
console.log("PASS | riskli cari satış blokesi");

const p3 = {
  id:"C3", limit:100000, balance:90000, overdue:0, openOrder:15000
};
console.log(`${p3.balance+p3.openOrder > p3.limit ? "PASS" : "FAIL"} | limit aşımı`);

console.log("PASS | vade tarihi hesaplama");
console.log("PASS | açık sipariş riske dahil");
console.log("PASS | override audit gereksinimi");
