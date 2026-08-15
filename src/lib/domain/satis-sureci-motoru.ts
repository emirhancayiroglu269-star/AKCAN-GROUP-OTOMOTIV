export type SatisBelgeDurumu =
  | "TEKLIF"
  | "SIPARIS"
  | "SEVK"
  | "FATURA"
  | "TAMAMLANDI"
  | "IPTAL";

export interface SatisSureciBelgesi {
  id: string;
  belgeNo: string;
  musteriId: string;
  durum: SatisBelgeDurumu;
  kalemler: Array<{
    urunId: string;
    miktar: number;
    birimFiyat: number;
    sevkEdilenMiktar: number;
    faturalananMiktar: number;
  }>;
  kaynakBelgeId?: string;
  idempotencyKey: string;
}

const gecisler: Record<SatisBelgeDurumu, SatisBelgeDurumu[]> = {
  TEKLIF: ["SIPARIS", "IPTAL"],
  SIPARIS: ["SEVK", "FATURA", "IPTAL"],
  SEVK: ["FATURA", "TAMAMLANDI"],
  FATURA: ["TAMAMLANDI"],
  TAMAMLANDI: [],
  IPTAL: [],
};

export function satisDurumGecisiUygunMu(
  mevcut: SatisBelgeDurumu,
  hedef: SatisBelgeDurumu
): boolean {
  return gecisler[mevcut].includes(hedef);
}

export function satisBelgesiDogrula(
  belge: SatisSureciBelgesi
): void {
  if (!belge.belgeNo?.trim()) throw new Error("Belge numarası zorunlu.");
  if (!belge.musteriId?.trim()) throw new Error("Müşteri zorunlu.");
  if (!belge.idempotencyKey?.trim()) throw new Error("Idempotency key zorunlu.");
  if (!belge.kalemler.length) throw new Error("En az bir satış kalemi olmalı.");

  for (const k of belge.kalemler) {
    if (k.miktar <= 0) throw new Error("Miktar pozitif olmalı.");
    if (k.sevkEdilenMiktar < 0 || k.sevkEdilenMiktar > k.miktar) {
      throw new Error("Sevk miktarı geçersiz.");
    }
    if (k.faturalananMiktar < 0 || k.faturalananMiktar > k.miktar) {
      throw new Error("Faturalanan miktar geçersiz.");
    }
  }
}

export function kalanSevkMiktari(
  miktar: number,
  sevkEdilen: number
): number {
  return Math.max(0, miktar - sevkEdilen);
}

export function kalanFaturalamaMiktari(
  miktar: number,
  faturalanan: number
): number {
  return Math.max(0, miktar - faturalanan);
}
