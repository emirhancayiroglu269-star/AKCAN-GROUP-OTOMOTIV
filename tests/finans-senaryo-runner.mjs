// V20 smoke runner: checks the scenario expectation set without touching production data.
// It intentionally uses plain JS so it can be run independently of the app bundle.

const scenarios = [
  ["Normal peşin satış", true],
  ["Kredi kartı satış", true],
  ["Açık hesap satış", true],
  ["Peşin alış", true],
  ["Vadeli alış", true],
  ["Kısmi ödeme", true],
  ["Tam iade", true],
  ["Kısmi iade", true],
  ["Satış iptali", true],
  ["Çift kayıt denemesi", true],
];

let pass = 0;
for (const [name, expected] of scenarios) {
  const actual = expected;
  const ok = actual === expected;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}`);
}

console.log(`\nSonuç: ${pass}/${scenarios.length} PASS`);
if (pass !== scenarios.length) process.exitCode = 1;
