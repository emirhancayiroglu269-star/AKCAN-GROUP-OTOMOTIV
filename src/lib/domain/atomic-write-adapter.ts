export interface AtomicWriteInput {
  data: unknown;
  updatedBy: string;
  idempotencyKey: string;
  expectedVersion: number;
}

export interface AtomicWriteAdapter {
  write(input: AtomicWriteInput): Promise<{
    ok: boolean;
    version?: number;
    duplicate?: boolean;
    error?: string;
  }>;
}

/**
 * V43 adapter contract.
 *
 * The actual Supabase RPC invocation should live behind this interface.
 * This prevents UI/components from calling write_app_state directly.
 */
export function validateAtomicWriteInput(
  input: AtomicWriteInput
): { ok: boolean; error?: string } {
  if (!input.updatedBy?.trim()) return { ok: false, error: "updatedBy zorunlu." };
  if (!input.idempotencyKey?.trim()) return { ok: false, error: "idempotencyKey zorunlu." };
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: "expectedVersion geçersiz." };
  }
  return { ok: true };
}
