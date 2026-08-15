export type StokHareketTipi =
  | "ALIS"
  | "SATIS"
  | "IADE"
  | "IPTAL"
  | "SAYIM_GIRIS"
  | "SAYIM_CIKIS"
  | "TRANSFER_CIKIS"
  | "TRANSFER_GIRIS"
  | "DUZELTME";

export interface StokHareket {
  id: string;
  parcaId: string;
  miktar: number;
  tip: StokHareketTipi;
  belgeNo?: string;
  kaynakIslemId?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface StokDurumu {
  parcaId: string;
  mevcut: number;
}

const ETKI: Record<StokHareketTipi, 1 | -1> = {
  ALIS: 1,
  SATIS: -1,
  IADE: 1,
  IPTAL: 1,
  SAYIM_GIRIS: 1,
  SAYIM_CIKIS: -1,
  TRANSFER_CIKIS: -1,
  TRANSFER_GIRIS: 1,
  DUZELTME: 1,
};

export function stokEtki(hareket: Pick<StokHareket, "tip" | "miktar">): number {
  if (!Number.isFinite(hareket.miktar) || hareket.miktar <= 0) {
    throw new Error("Stok miktarı sıfırdan büyük olmalı.");
  }
  return ETKI[hareket.tip] * hareket.miktar;
}

export function stokHesapla(
  baslangic: number,
  hareketler: Array<Pick<StokHareket, "tip" | "miktar">>,
  negatifStokIzinli = false
): number {
  let mevcut = baslangic;

  for (const hareket of hareketler) {
    mevcut += stokEtki(hareket);

    if (!negatifStokIzinli && mevcut < 0) {
      throw new Error("NEGATIVE_STOCK: işlem stok miktarını negatife düşürüyor.");
    }
  }

  return mevcut;
}

export function duplicateStokHareketi(
  mevcutIdempotencyKeys: Set<string>,
  key: string
): boolean {
  return mevcutIdempotencyKeys.has(key);
}
