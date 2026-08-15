const cases = [
  [{ authenticated: true, userId: "u1", active: true }, true],
  [{ authenticated: false, userId: "u1", active: true }, false],
  [{ authenticated: true, userId: "", active: true }, false],
  [{ authenticated: true, userId: "u1", active: false }, false],
  [null, false],
];

for (const [session, expected] of cases) {
  const actual = Boolean(
    session?.authenticated &&
    session?.userId &&
    session?.active !== false
  );
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} | session guard | beklenen=${expected} gerçek=${actual}`);
  if (!ok) process.exitCode = 1;
}
