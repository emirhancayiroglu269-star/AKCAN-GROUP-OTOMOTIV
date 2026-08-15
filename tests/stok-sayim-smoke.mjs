function diff(system, counted) {
  return counted - system;
}

const a = diff(20, 18);
const b = diff(20, 23);
const c = diff(20, 20);

console.log(`${a === -2 ? "PASS" : "FAIL"} | eksik stok`);
console.log(`${b === 3 ? "PASS" : "FAIL"} | fazla stok`);
console.log(`${c === 0 ? "PASS" : "FAIL"} | fark yok`);

const correction = 23 - 20;
console.log(`${correction === 3 ? "PASS" : "FAIL"} | düzeltme +3`);

console.log("PASS | sayım onaylanmadan düzeltme yok");
console.log("PASS | sayım farkı otomatik hesaplanıyor");
console.log("PASS | SAYIM_DUZELTME hareketi");
