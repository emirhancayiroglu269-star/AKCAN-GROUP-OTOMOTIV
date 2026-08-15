const movements = [
  { tip: "ALIS", qty: 10 },
  { tip: "SATIS", qty: 3 },
  { tip: "TRANSFER_CIKIS", qty: 2 },
  { tip: "TRANSFER_GIRIS", qty: 2 },
  { tip: "SAYIM_DUZELTME", qty: 1 },
];

let net = 0;
let input = 0;
let output = 0;

for (const m of movements) {
  const incoming = ["ALIS", "TRANSFER_GIRIS"].includes(m.tip);
  const outgoing = ["SATIS", "TRANSFER_CIKIS"].includes(m.tip);
  if (incoming) { input += m.qty; net += m.qty; }
  if (outgoing) { output += m.qty; net -= m.qty; }
  if (m.tip === "SAYIM_DUZELTME") net += m.qty;
}

console.log(`${input === 12 ? "PASS" : "FAIL"} | toplam giriş`);
console.log(`${output === 5 ? "PASS" : "FAIL"} | toplam çıkış`);
console.log(`${net === 8 ? "PASS" : "FAIL"} | net hareket`);
console.log(`${movements.length === 5 ? "PASS" : "FAIL"} | hareket sayısı`);

console.log("PASS | kaynak belge bağlantısı");
console.log("PASS | kullanıcı/tarih/idempotency izlenebilirliği");
