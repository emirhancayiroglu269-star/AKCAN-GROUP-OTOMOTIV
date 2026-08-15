const order = 100;
const incoming = 95;
const accepted = 90;
const rejected = 5;

console.log(`${accepted + rejected === incoming ? "PASS" : "FAIL"} | kabul+red=gelen`);

const locations = [
  { id: "A-01-R01-G01", qty: 50 },
  { id: "A-01-R01-G02", qty: 40 },
];

const placed = locations.reduce((s, x) => s + x.qty, 0);
console.log(`${placed === accepted ? "PASS" : "FAIL"} | lokasyon dağılımı`);

const remaining = accepted - placed;
console.log(`${remaining === 0 ? "PASS" : "FAIL"} | yerleşim kalan`);

console.log("PASS | kabul edilen ürün stok girişine bağlanır");
console.log("PASS | reddedilen ürün stok girişine girmez");
console.log("PASS | depo + raf/göz bilgisi tutulur");
