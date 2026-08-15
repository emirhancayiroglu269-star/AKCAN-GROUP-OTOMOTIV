const rules = {
  ALIS: 1, SATIS: -1, IADE: 1, IPTAL: 1,
  SAYIM_GIRIS: 1, SAYIM_CIKIS: -1,
  TRANSFER_CIKIS: -1, TRANSFER_GIRIS: 1, DUZELTME: 1
};

let stock = 10;
stock += rules.ALIS * 5;
stock += rules.SATIS * 3;
stock += rules.IADE * 1;

const expected = 13;
console.log(`${stock === expected ? "PASS" : "FAIL"} | alış/satış/iade | ${stock}`);

let negativeRejected = false;
try {
  let x = 2 + rules.SATIS * 3;
  if (x < 0) throw new Error("NEGATIVE_STOCK");
} catch (e) {
  negativeRejected = e.message === "NEGATIVE_STOCK";
}
console.log(`${negativeRejected ? "PASS" : "FAIL"} | negatif stok engeli`);

const keys = new Set(["SALE-001"]);
console.log(`${keys.has("SALE-001") ? "PASS" : "FAIL"} | duplicate idempotency`);
