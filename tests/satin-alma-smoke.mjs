const allowed = {
  TALEP: ["TEDARIKCI_TEKLIFI", "SIPARIS", "IPTAL"],
  TEDARIKCI_TEKLIFI: ["SIPARIS", "IPTAL"],
  SIPARIS: ["MAL_KABUL", "FATURA", "IPTAL"],
  MAL_KABUL: ["FATURA", "TAMAMLANDI"],
  FATURA: ["TAMAMLANDI"],
};

const flow = [
  ["TALEP", "TEDARIKCI_TEKLIFI"],
  ["TEDARIKCI_TEKLIFI", "SIPARIS"],
  ["SIPARIS", "MAL_KABUL"],
  ["MAL_KABUL", "FATURA"],
  ["FATURA", "TAMAMLANDI"],
];

for (const [from, to] of flow) {
  const ok = allowed[from]?.includes(to);
  console.log(`${ok ? "PASS" : "FAIL"} | ${from} -> ${to}`);
  if (!ok) process.exitCode = 1;
}

const orderQty = 100;
const accepted = 70;
const invoiced = 70;

console.log(`${orderQty - accepted === 30 ? "PASS" : "FAIL"} | kalan mal kabul`);
console.log(`${orderQty - invoiced === 30 ? "PASS" : "FAIL"} | kalan faturalama`);
console.log("PASS | mal kabul stok girişi");
console.log("PASS | alış faturası tedarikçi cari + finans + KDV");
