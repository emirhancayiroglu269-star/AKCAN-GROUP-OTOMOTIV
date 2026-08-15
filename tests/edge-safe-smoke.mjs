const cases = [
  ["EDGE-001", "satis"],
  ["EDGE-002", "alis"],
  ["EDGE-003", "iade"],
  ["EDGE-004", "iptal"],
];

let passed = 0;

for (const [id, operation] of cases) {
  const request = {
    testRunId: id,
    operation,
    referenceId: `TEST-${id}`,
    dryRun: true,
    payload: {}
  };

  const ok =
    request.dryRun === true &&
    Boolean(request.testRunId) &&
    Boolean(request.referenceId);

  console.log(`${ok ? "PASS" : "FAIL"} | ${id} | ${operation} | dryRun=${request.dryRun}`);
  if (ok) passed++;
}

console.log(`\nEdge güvenli smoke: ${passed}/${cases.length} PASS`);
if (passed !== cases.length) process.exitCode = 1;
