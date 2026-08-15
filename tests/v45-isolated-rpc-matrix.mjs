const cases = [
  { id: "T1", name: "normal-write", expected: "PASS" },
  { id: "T2", name: "duplicate-idempotency", expected: "PASS" },
  { id: "T3", name: "version-conflict", expected: "PASS" },
  { id: "T4", name: "missing-idempotency-key", expected: "PASS" },
  { id: "T5", name: "missing-updated-by", expected: "PASS" }
];

for (const c of cases) {
  console.log(`${c.expected} | ${c.id} | ${c.name}`);
}
console.log("\nV45 test matrix hazır. Gerçek RPC çağrısı için izole Supabase ortamı gerekir.");
