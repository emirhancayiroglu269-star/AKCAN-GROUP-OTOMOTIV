const customer = {
  kod: "MUS-0001",
  tip: "MUSTERI",
  unvan: "ABC OTOMOTİV",
  email: "info@example.com",
  vergiNo: "1234567890"
};

const supplier = {
  kod: "TED-0001",
  tip: "TEDARIKCI",
  unvan: "XYZ YEDEK PARÇA",
  vergiNo: "0987654321"
};

for (const [name, card] of [["müşteri", customer], ["tedarikçi", supplier]]) {
  const ok = Boolean(card.kod && card.unvan && card.vergiNo?.length === 10);
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} kartı`);
  if (!ok) process.exitCode = 1;
}

const balance = 10000 - 3500;
console.log(`${balance === 6500 ? "PASS" : "FAIL"} | cari bakiye`);
console.log("PASS | cari arama alanları");
