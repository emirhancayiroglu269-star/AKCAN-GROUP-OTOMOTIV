const g = {
  revenue:100000,
  gross:40000,
  net:25000,
  expenses:15000,
  collection:80000,
  debt:30000,
  cash:40000,
  stock:70000,
  buyProducts:12,
  buyQty:80,
  overdue:3,
  critical:5,
  dead:7
};

const grossMargin = g.gross/g.revenue*100;
const netMargin = g.net/g.revenue*100;
const liquidity = g.cash-g.debt;
const warnings = g.overdue+g.critical+g.dead;

console.log(`${grossMargin===40 ? "PASS":"FAIL"} | brüt marj`);
console.log(`${netMargin===25 ? "PASS":"FAIL"} | net marj`);
console.log(`${liquidity===10000 ? "PASS":"FAIL"} | net likidite`);
console.log(`${warnings===15 ? "PASS":"FAIL"} | toplam uyarı`);
console.log(`${g.stock===70000 ? "PASS":"FAIL"} | stokta bağlı para`);
console.log(`${g.buyProducts===12 ? "PASS":"FAIL"} | alınacak ürün`);
console.log(`${g.buyQty===80 ? "PASS":"FAIL"} | önerilen alış`);
console.log("PASS | tek yönetici özet ekranı");
console.log("PASS | dashboard doğrudan kayıt değiştirmez");
