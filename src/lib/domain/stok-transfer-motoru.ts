export type TransferDurumu =
  | "TASLAK"
  | "ONAY_BEKLIYOR"
  | "ONAYLANDI"
  | "TAMAMLANDI"
  | "IPTAL";

export interface StokTransferKalemi {
  urunId: string;
  kaynakDepoId: string;
  kaynakLokasyonId: string;
  hedefDepoId: string;
  hedefLokasyonId: string;
  miktar: number;
}

export interface StokTransfer {
  id: string;
  transferNo: string;
  durum: TransferDurumu;
  kalemler: StokTransferKalemi[];
  idempotencyKey: string;
  aciklama?: string;
  tarih: string;
}

export function transferKalemiDogrula(k: StokTransferKalemi): void {
  if (!k.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!k.kaynakDepoId?.trim() || !k.kaynakLokasyonId?.trim()) {
    throw new Error("Kaynak depo/lokasyon zorunlu.");
  }
  if (!k.hedefDepoId?.trim() || !k.hedefLokasyonId?.trim()) {
    throw new Error("Hedef depo/lokasyon zorunlu.");
  }
  if (k.miktar <= 0) throw new Error("Transfer miktarı pozitif olmalı.");

  if (
    k.kaynakDepoId === k.hedefDepoId &&
    k.kaynakLokasyonId === k.hedefLokasyonId
  ) {
    throw new Error("Kaynak ve hedef lokasyon aynı olamaz.");
  }
}

export function transferStokEtki(miktar: number) {
  if (miktar <= 0) throw new Error("Transfer miktarı geçersiz.");
  return {
    kaynakStok: -miktar,
    hedefStok: miktar,
    netStok: 0,
  };
}

export function transferTamamlanabilirMi(
  kaynakStok: number,
  miktar: number
): boolean {
  return miktar > 0 && kaynakStok >= miktar;
}
