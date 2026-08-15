export type SayimDurumu =
  | "TASLAK"
  | "SAYIMDA"
  | "TAMAMLANDI"
  | "ONAYLANDI"
  | "IPTAL";

export interface SayimKalemi {
  urunId: string;
  depoId: string;
  lokasyonId: string;
  sistemMiktari: number;
  sayilanMiktar: number;
  fark: number;
  aciklama?: string;
}

export interface StokSayim {
  id: string;
  sayimNo: string;
  durum: SayimDurumu;
  kalemler: SayimKalemi[];
  idempotencyKey: string;
  tarih: string;
}

export function sayimFarkiHesapla(
  sistemMiktari: number,
  sayilanMiktar: number
): number {
  if (sistemMiktari < 0 || sayilanMiktar < 0) {
    throw new Error("Sayım miktarları negatif olamaz.");
  }
  return sayilanMiktar - sistemMiktari;
}

export function sayimKalemiDogrula(k: SayimKalemi): void {
  if (!k.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!k.depoId?.trim() || !k.lokasyonId?.trim()) {
    throw new Error("Depo/lokasyon zorunlu.");
  }
  if (k.sistemMiktari < 0 || k.sayilanMiktar < 0) {
    throw new Error("Miktarlar negatif olamaz.");
  }

  const hesaplananFark = sayimFarkiHesapla(
    k.sistemMiktari,
    k.sayilanMiktar
  );

  if (hesaplananFark !== k.fark) {
    throw new Error("Sayım farkı sistemle uyuşmuyor.");
  }
}

export function sayimFarkiAciklamasi(fark: number): string {
  if (fark > 0) return "FAZLA STOK";
  if (fark < 0) return "EKSIK STOK";
  return "FARK YOK";
}

export function duzeltmeStokEtki(fark: number) {
  return {
    stokDuzeltme: fark,
    kaynak: "SAYIM_DUZELTME" as const,
  };
}
