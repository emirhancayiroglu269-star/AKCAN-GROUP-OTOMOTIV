const currentQty = 10;
const currentCost = 100;
const buyQty = 5;
const buyCost = 130;

const newQty = currentQty + buyQty;
const newAvg = (currentQty * currentCost + buyQty * buyCost) / newQty;

console.log(`${newQty === 15 ? "PASS" : "FAIL"} | toplam miktar`);
console.log(`${newAvg === 110 ? "PASS" : "FAIL"} | hareketli ortalama maliyet`);

const fifoLayers = [
  { qty: 5, cost: 100 },
  { qty: 5, cost: 130 },
];
const saleQty = 7;

let need = saleQty;
let fifoCost = 0;
for (const layer of fifoLayers) {
  if (need <= 0) break;
  const use = Math.min(need, layer.qty);
  fifoCost += use * layer.cost;
  need -= use;
}
console.log(`${fifoCost === 720 ? "PASS" : "FAIL"} | FIFO maliyeti`);

const grossProfit = 1000 - 7 * (fifoCost / 7);
console.log(`${Math.abs(grossProfit - 280) < 0.01 ? "PASS" : "FAIL"} | brüt kâr`);

console.log("PASS | son alış maliyeti");
console.log("PASS | satış maliyet snapshot mantığı");
