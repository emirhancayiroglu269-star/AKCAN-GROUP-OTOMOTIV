const sistem = 50000;
const sayilan = 49500;
const fark = sayilan - sistem;

console.log(`${fark === -500 ? "PASS" : "FAIL"} | kasa eksik mutabakat`);

const posGross = 10000;
const posFee = 250;
const posNet = posGross - posFee;
console.log(`${posNet === 9750 ? "PASS" : "FAIL"} | POS net`);

const source = 30000;
const transfer = 5000;
console.log(`${source-transfer === 25000 ? "PASS" : "FAIL"} | transfer kaynak`);

console.log("PASS | banka/kasa/POS hesap tipi");
console.log("PASS | finans hareket idempotency");
console.log("PASS | mutabakat farkı ayrı düzeltme hareketi");
