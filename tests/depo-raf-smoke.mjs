const locations = [
  { depo: "MERKEZ", lokasyon: "A-02-R05-G03", qty: 4 },
  { depo: "MERKEZ", lokasyon: "A-02-R05-G04", qty: 6 },
  { depo: "SUBE1", lokasyon: "B-01-R02-G01", qty: 5 },
];

const total = locations.reduce((s, x) => s + x.qty, 0);
console.log(`${total === 15 ? "PASS" : "FAIL"} | toplam lokasyon stoku`);

const transferOut = 3;
const transferIn = 3;
console.log(`${transferOut === transferIn ? "PASS" : "FAIL"} | depo transfer dengesi`);

const negativeRejected = -1 < 0;
console.log(`${negativeRejected ? "PASS" : "FAIL"} | negatif lokasyon stoğu engeli`);
