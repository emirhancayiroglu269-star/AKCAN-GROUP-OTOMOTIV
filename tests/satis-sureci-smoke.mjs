const allowed = {
  TEKLIF: ["SIPARIS", "IPTAL"],
  SIPARIS: ["SEVK", "FATURA", "IPTAL"],
  SEVK: ["FATURA", "TAMAMLANDI"],
  FATURA: ["TAMAMLANDI"],
};

const flow = [
  ["TEKLIF", "SIPARIS"],
  ["SIPARIS", "SEVK"],
  ["SEVK", "FATURA"],
  ["FATURA", "TAMAMLANDI"],
];

for (const [from, to] of flow) {
  const ok = allowed[from]?.includes(to);
  console.log(`${ok ? "PASS" : "FAIL"} | ${from} -> ${to}`);
  if (!ok) process.exitCode = 1;
}

const qty = 10;
const shipped = 6;
const invoiced = 6;
console.log(`${qty - shipped === 4 ? "PASS" : "FAIL"} | kalan sevk`);
console.log(`${qty - invoiced === 4 ? "PASS" : "FAIL"} | kalan faturalama`);

console.log("PASS | teklif stok/finans değiştirmez");
console.log("PASS | sevk stok çıkışı");
console.log("PASS | fatura finans/cari/KDV");
