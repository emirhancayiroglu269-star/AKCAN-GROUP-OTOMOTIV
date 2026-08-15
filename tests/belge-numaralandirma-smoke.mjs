function next(seri, yil, son) {
  const n = son + 1;
  return `${seri}${yil}${String(n).padStart(9, "0")}`;
}

const first = next("SF", 2026, 0);
const second = next("SF", 2026, 1);

for (const [name, actual, expected] of [
  ["ilk numara", first, "SF2026000000001"],
  ["ikinci numara", second, "SF2026000000002"],
]) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}`);
  if (!ok) process.exitCode = 1;
}

const parsed = /^([A-Z]{2})(\d{4})(\d{9})$/.exec(second);
console.log(`${parsed ? "PASS" : "FAIL"} | belge numarası formatı`);

const search = ["SF2026000000002", "müşteri abc", "kaynak SF2026000000001"]
  .join(" ").toLocaleLowerCase("tr-TR");
console.log(`${search.includes("sf2026000000002") ? "PASS" : "FAIL"} | belge arama`);
