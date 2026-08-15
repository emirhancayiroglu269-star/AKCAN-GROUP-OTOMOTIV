export type Kayit = Record<string, unknown>;

export function kayitMi(value: unknown): value is Kayit {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function metin(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function sayi(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function booleanDeger(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}
