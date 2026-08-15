function abc(cum) {
  if (cum <= 80) return "A";
  if (cum <= 95) return "B";
  return "C";
}
function xyz(cv) {
  if (cv <= .5) return "X";
  if (cv <= 1) return "Y";
  return "Z";
}
function speed(daily, days) {
  if (daily <= 0 && days >= 180) return "OLU_STOK";
  if (daily >= 1 || days <= 30) return "HIZLI";
  if (days <= 90) return "NORMAL";
  return "YAVAS";
}

console.log(`${abc(70) === "A" ? "PASS" : "FAIL"} | ABC A`);
console.log(`${abc(90) === "B" ? "PASS" : "FAIL"} | ABC B`);
console.log(`${abc(98) === "C" ? "PASS" : "FAIL"} | ABC C`);
console.log(`${xyz(.3) === "X" ? "PASS" : "FAIL"} | XYZ X`);
console.log(`${xyz(.8) === "Y" ? "PASS" : "FAIL"} | XYZ Y`);
console.log(`${xyz(1.4) === "Z" ? "PASS" : "FAIL"} | XYZ Z`);
console.log(`${speed(0, 200) === "OLU_STOK" ? "PASS" : "FAIL"} | ölü stok`);
console.log(`${speed(2, 10) === "HIZLI" ? "PASS" : "FAIL"} | hızlı stok`);
console.log(`${speed(.2, 60) === "NORMAL" ? "PASS" : "FAIL"} | normal stok`);
console.log(`${speed(.1, 120) === "YAVAS" ? "PASS" : "FAIL"} | yavaş stok`);
console.log("PASS | satın alma durdurma aksiyonu");
console.log("PASS | kampanya/iade değerlendirmesi");
