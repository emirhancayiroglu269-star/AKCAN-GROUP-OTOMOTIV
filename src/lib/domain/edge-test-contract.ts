export interface EdgeTestRequest {
  testRunId: string;
  operation: "satis" | "alis" | "iade" | "iptal";
  referenceId: string;
  dryRun: true;
  payload: Record<string, unknown>;
}

export interface EdgeTestResponse {
  ok: boolean;
  testRunId: string;
  operation: string;
  referenceId: string;
  committed: false;
  errors: string[];
  warnings: string[];
}

export function edgeTestRequestOlustur(
  input: Omit<EdgeTestRequest, "dryRun">
): EdgeTestRequest {
  return {
    ...input,
    dryRun: true,
  };
}

export function edgeTestResponseDogrula(
  response: EdgeTestResponse
): { ok: boolean; hatalar: string[] } {
  const hatalar: string[] = [];

  if (!response.testRunId) hatalar.push("testRunId eksik.");
  if (!response.operation) hatalar.push("operation eksik.");
  if (!response.referenceId) hatalar.push("referenceId eksik.");
  if (response.committed !== false) {
    hatalar.push("Test isteği gerçek commit yapmış görünüyor.");
  }

  return { ok: hatalar.length === 0, hatalar };
}
