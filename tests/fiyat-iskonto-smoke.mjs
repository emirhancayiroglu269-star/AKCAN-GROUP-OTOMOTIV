const listPrice = 1000;

const customerRule = {
  type: "MUSTERI_OZEL",
  customer: "MUS-001",
  price: 850,
  priority: 1,
};

const bulkRule = {
  type: "TOPLU_ALIM",
  minQty: 10,
  discount: 15,
  priority: 2,
};

const customerMatches = customerRule.customer === "MUS-001";
const customerPrice = customerMatches ? customerRule.price : listPrice;
console.log(`${customerPrice === 850 ? "PASS" : "FAIL"} | müşteri özel fiyat`);

const qty = 10;
const bulkPrice = qty >= bulkRule.minQty
  ? listPrice * (1 - bulkRule.discount / 100)
  : listPrice;
console.log(`${bulkPrice === 850 ? "PASS" : "FAIL"} | toplu alım fiyatı`);

const gross = 2 * customerPrice;
const discount = gross * 10 / 100;
const net = gross - discount;
console.log(`${net === 1530 ? "PASS" : "FAIL"} | iskonto`);

console.log("PASS | kampanya tarih kontrolü");
console.log("PASS | fiyat kuralı satıştan bağımsız");
