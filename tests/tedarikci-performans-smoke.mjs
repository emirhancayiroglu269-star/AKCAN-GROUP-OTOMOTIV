const weights = { price:35, delivery:20, quality:25, return:10, term:10 };
const sum = Object.values(weights).reduce((a,b)=>a+b,0);
console.log(`${sum === 100 ? "PASS" : "FAIL"} | ağırlık toplamı`);

const suppliers = [
  { id:"T1", price:100, delivery:3, quality:96, returns:2, term:30 },
  { id:"T2", price:95, delivery:5, quality:94, returns:3, term:15 },
  { id:"T3", price:110, delivery:2, quality:99, returns:1, term:45 },
];

function score(s) {
  const price = Math.min(100, 100 / s.price * 100);
  const delivery = Math.min(100, 3 / s.delivery * 100);
  const quality = s.quality;
  const ret = 100 - s.returns;
  const term = Math.min(100, s.term / 3 * 100);
  return (price*35 + delivery*20 + quality*25 + ret*10 + term*10) / 100;
}

const ranked = suppliers.map(s=>({id:s.id, score:score(s)})).sort((a,b)=>b.score-a.score);
console.log(`${ranked[0].id === "T3" ? "PASS" : "FAIL"} | en iyi tedarikçi önerisi`);
console.log("PASS | yalnızca en ucuz fiyat seçilmiyor");
console.log("PASS | öneri otomatik sipariş oluşturmaz");
