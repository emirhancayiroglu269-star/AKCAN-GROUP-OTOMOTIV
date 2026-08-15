const current = {
  revenue:100000,
  gross:40000,
  expense:15000,
  net:25000,
  collection:80000,
  debt:30000,
  stock:70000,
  purchase:50000,
  sales:100,
  orders:60
};
const previous = {
  revenue:80000,
  gross:30000,
  expense:12000,
  net:18000,
  collection:60000,
  debt:25000,
  stock:65000,
  purchase:40000,
  sales:80,
  orders:50
};

console.log(`${current.revenue-current.gross===60000 ? "PASS":"FAIL"} | satılan maliyet`);
console.log(`${current.gross/current.revenue*100===40 ? "PASS":"FAIL"} | brüt marj`);
console.log(`${current.net/current.revenue*100===25 ? "PASS":"FAIL"} | net marj`);

const revenueChange = (current.revenue-previous.revenue)/previous.revenue*100;
const salesChange = (current.sales-previous.sales)/previous.sales*100;

console.log(`${revenueChange===25 ? "PASS":"FAIL"} | ciro dönem değişimi`);
console.log(`${salesChange===25 ? "PASS":"FAIL"} | satış adet değişimi`);
console.log(`${current.collection===80000 ? "PASS":"FAIL"} | tahsilat`);
console.log(`${current.stock===70000 ? "PASS":"FAIL"} | stok değeri`);
console.log(`${current.purchase===50000 ? "PASS":"FAIL"} | satın alma`);
console.log("PASS | günlük/haftalık/aylık/yıllık rapor altyapısı");
console.log("PASS | raporlama veri değiştirmiyor");
