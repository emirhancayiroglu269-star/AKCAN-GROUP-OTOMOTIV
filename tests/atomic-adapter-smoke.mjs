const valid = {
  data: {},
  updatedBy: "test-user",
  idempotencyKey: "TEST-RPC-001",
  expectedVersion: 14
};

const invalidVersion = { ...valid, expectedVersion: -1 };
const invalidKey = { ...valid, idempotencyKey: "" };

function ok(x) {
  return Boolean(x.updatedBy?.trim()) &&
    Boolean(x.idempotencyKey?.trim()) &&
    Number.isInteger(x.expectedVersion) &&
    x.expectedVersion >= 0;
}

for (const [name, value, expected] of [
  ["valid", valid, true],
  ["invalid-version", invalidVersion, false],
  ["invalid-key", invalidKey, false],
]) {
  const actual = ok(value);
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}`);
  if (!pass) process.exitCode = 1;
}
