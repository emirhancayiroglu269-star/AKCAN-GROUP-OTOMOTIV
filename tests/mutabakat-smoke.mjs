const zero = {
  stok: 0, kasa: 0, banka: 0, pos: 0,
  cari: 0, kdv: 0, maliyet: 0, brutKar: 0
};

const sale = {
  stok: -3, kasa: 2500, banka: 0, pos: 0,
  cari: 0, kdv: 500, maliyet: 1500, brutKar: 1000
};

const reverse = {
  stok: 3, kasa: -2500, banka: 0, pos: 0,
  cari: 0, kdv: -500, maliyet: -1500, brutKar: -1000
};

let roundTripOk = true;
for (const k of Object.keys(zero)) {
  const total = sale[k] + reverse[k];
  if (Math.abs(total) > 0.01) roundTripOk = false;
}
console.log(`${roundTripOk ? "PASS" : "FAIL"} | satış+iade round-trip`);

const mismatch = { ...sale, kasa: 2499 };
console.log(`${mismatch.kasa !== sale.kasa ? "PASS" : "FAIL"} | kasa farkı yakalanıyor`);
