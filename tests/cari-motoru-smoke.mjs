const customer = [
  { tip: "MUSTERI", hareket: "SATIS", tutar: 5000 },
  { tip: "MUSTERI", hareket: "TAHSILAT", tutar: 2000 },
];

const supplier = [
  { tip: "TEDARIKCI", hareket: "ALIS", tutar: 7000 },
  { tip: "TEDARIKCI", hareket: "ODEME", tutar: 3000 },
];

function calc(items) {
  let borc = 0, alacak = 0;
  for (const h of items) {
    const customer = h.tip === "MUSTERI";
    if ((customer && ["SATIS","TAHSILAT"].includes(h.hareket)) ||
        (!customer && ["ALIS","ODEME"].includes(h.hareket))) {
      alacak += h.tutar;
    } else {
      borc += h.tutar;
    }
  }
  return { borc, alacak, bakiye: alacak - borc };
}

const c = calc(customer);
const s = calc(supplier);

for (const [name, actual, expected] of [
  ["müşteri alacak", c.alacak, 7000],
  ["müşteri borç", c.borc, 0],
  ["tedarikçi alacak", s.alacak, 10000],
  ["tedarikçi borç", s.borc, 0],
]) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}
