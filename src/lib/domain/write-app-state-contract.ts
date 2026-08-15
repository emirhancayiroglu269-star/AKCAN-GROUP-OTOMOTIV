export interface WriteAppStateRequest {
  data: unknown;
  updatedBy: string;
  idempotencyKey: string;
  expectedVersion: number;
  dryRun?: boolean;
}

export interface WriteAppStateResult {
  ok: boolean;
  committed: boolean;
  version?: number;
  updatedAt?: string;
  idempotencyKey: string;
  duplicate?: boolean;
  error?: string;
}

export function validateWriteAppStateRequest(
  req: WriteAppStateRequest
): { ok: boolean; error?: string } {
  if (!req.updatedBy?.trim()) return { ok: false, error: "updatedBy zorunlu." };
  if (!req.idempotencyKey?.trim()) return { ok: false, error: "idempotencyKey zorunlu." };
  if (!Number.isInteger(req.expectedVersion) || req.expectedVersion < 0) {
    return { ok: false, error: "expectedVersion geçersiz." };
  }
  return { ok: true };
}
