export interface IdempotencyRecord {
  key: string;
  operation: string;
  referenceId: string;
  createdAt: string;
}

export function idempotencyKey(
  operation: string,
  referenceId: string
): string {
  return `${operation}:${referenceId}`;
}

export function idempotentHareketId(
  operation: string,
  referenceId: string,
  detail?: string
): string {
  return [operation, referenceId, detail || "root"]
    .filter(Boolean)
    .join(":");
}

export function ayniIslemMi(
  existingKeys: Set<string>,
  operation: string,
  referenceId: string
): boolean {
  return existingKeys.has(idempotencyKey(operation, referenceId));
}
