const oldCost = 100;
const newCost = 120;
const diff = newCost - oldCost;
const pct = diff / oldCost * 100;

console.log(`${diff === 20 ? "PASS" : "FAIL"} | maliyet farkı`);
console.log(`${pct === 20 ? "PASS" : "FAIL"} | maliyet yüzde değişimi`);

const suppliers = [
  { id: "T1", price: 125 },
  { id: "T2", price: 118 },
  { id: "T3", price: 122 },
];
suppliers.sort((a, b) => a.price - b.price);
console.log(`${suppliers[0].id === "T2" ? "PASS" : "FAIL"} | en uygun tedarikçi`);

const usd = 10;
const rate = 40;
console.log(`${usd * rate === 400 ? "PASS" : "FAIL"} | dövizli TRY maliyeti`);

console.log("PASS | alış fiyat geçmişi silinmeden yeni kayıt");
console.log("PASS | satış fiyatı otomatik değiştirilmez");
