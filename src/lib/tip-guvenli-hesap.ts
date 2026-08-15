export function sonluSayi(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function paraYuvarla(value: unknown): number {
  return Math.round(sonluSayi(value) * 100) / 100;
}
