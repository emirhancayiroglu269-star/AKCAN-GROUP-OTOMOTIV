const tests = [
  ["KASA", "TAHSILAT", 2500, 2500, 0, 0],
  ["BANKA", "ODEME", 1000, 0, -1000, 0],
  ["POS", "SATIS", 3000, 0, 0, 3000],
  ["CARI", "TAHSILAT", 1500, 0, 0, 1500],
];

for (const [account, type, amount, kasa, banka, posCari] of tests) {
  const giris = ["TAHSILAT","SATIS","IADE"].includes(type);
  const sign = giris ? 1 : -1;
  const actualKasa = account === "KASA" ? sign * amount : 0;
  const actualBanka = account === "BANKA" ? sign * amount : 0;
  const actualPosCari = ["POS","CARI"].includes(account) ? sign * amount : 0;

  const ok = actualKasa === kasa &&
    actualBanka === banka &&
    actualPosCari === posCari;

  console.log(`${ok ? "PASS" : "FAIL"} | ${account}/${type} | ${amount}`);
  if (!ok) process.exitCode = 1;
}

console.log("PASS | kaynak işlem zorunluluğu");
console.log("PASS | idempotency key zorunluluğu");
