const valid = {
  updatedBy: "test-user",
  idempotencyKey: "TEST-001",
  expectedVersion: 10,
  dryRun: true,
  data: {}
};

const invalid = { ...valid, idempotencyKey: "" };

const validOk =
  Boolean(valid.updatedBy) &&
  Boolean(valid.idempotencyKey) &&
  Number.isInteger(valid.expectedVersion);

const invalidOk =
  Boolean(invalid.updatedBy) &&
  Boolean(invalid.idempotencyKey) &&
  Number.isInteger(invalid.expectedVersion);

console.log(`${validOk ? "PASS" : "FAIL"} | valid write contract`);
console.log(`${!invalidOk ? "PASS" : "FAIL"} | missing idempotency key rejected`);

if (!validOk || invalidOk) process.exitCode = 1;
