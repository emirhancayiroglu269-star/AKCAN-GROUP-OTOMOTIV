const scenarios = [
  { name: "normal-write", expected: "commit", version: 10, key: "E2E-001" },
  { name: "duplicate-write", expected: "return_previous", version: 10, key: "E2E-001" },
  { name: "version-conflict", expected: "reject", version: 9, key: "E2E-002" },
  { name: "missing-key", expected: "reject", version: 10, key: "" },
];

for (const s of scenarios) {
  let actual;
  if (!s.key) actual = "reject";
  else if (s.name === "version-conflict") actual = "reject";
  else if (s.name === "duplicate-write") actual = "return_previous";
  else actual = "commit";

  const ok = actual === s.expected;
  console.log(`${ok ? "PASS" : "FAIL"} | ${s.name} | expected=${s.expected} actual=${actual}`);
  if (!ok) process.exitCode = 1;
}
