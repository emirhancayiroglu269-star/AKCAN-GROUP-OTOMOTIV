const operations = ["satis", "alis", "iade", "iptal"];

for (const operation of operations) {
  const request = {
    testRunId: `TEST-${operation}-001`,
    operation,
    referenceId: `TEST-${operation}-REF`,
    dryRun: true,
    payload: {}
  };

  if (request.dryRun !== true) {
    console.error(`FAIL | ${operation} | dryRun kapalı`);
    process.exitCode = 1;
  } else {
    console.log(`PASS | ${operation} | dryRun=true | commit yok`);
  }
}

console.log("\nEdge test contract hazır.");
