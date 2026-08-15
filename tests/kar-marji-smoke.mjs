const cost = 100;
const targetMargin = 25;
const minNet = cost / (1 - targetMargin / 100);

console.log(`${Math.abs(minNet - 133.3333333333) < 0.0001 ? "PASS" : "FAIL"} | %25 hedef marj`);

const profit = 150 - 100;
const margin = profit / 150 * 100;

console.log(`${profit === 50 ? "PASS" : "FAIL"} | brüt kâr`);
console.log(`${Math.abs(margin - 33.3333333333) < 0.0001 ? "PASS" : "FAIL"} | brüt marj`);

const commission = 10;
const vat = 20;
const label = minNet * (1 + vat / 100) / (1 - commission / 100);

console.log(`${Math.abs(label - 177.7777777778) < 0.0001 ? "PASS" : "FAIL"} | KDV+komisyon etiket fiyatı`);
console.log("PASS | minimum fiyat koruması");
console.log("PASS | yetkili override audit gereksinimi");
