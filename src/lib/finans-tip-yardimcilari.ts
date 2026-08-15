/** Finans/stok hesaplarında string -> number ve tarih -> milisaniye dönüşümlerini
 * merkezi ve deterministik tutmak için yardımcılar. */
export function sayiyaCevir(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function tariheCevir(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function gunFarki(baslangic: unknown, bitis: unknown): number {
  const a = tariheCevir(baslangic);
  const b = tariheCevir(bitis);
  if (!a || !b) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / 86_400_000);
}
