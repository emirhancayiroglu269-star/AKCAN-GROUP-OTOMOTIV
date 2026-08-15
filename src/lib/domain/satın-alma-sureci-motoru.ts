export type SatinAlmaDurumu =
  | "TALEP"
  | "TEDARIKCI_TEKLIFI"
  | "SIPARIS"
  | "MAL_KABUL"
  | "FATURA"
  | "TAMAMLANDI"
  | "IPTAL";

export interface SatinAlmaBelgesi {
  id: string;
  belgeNo: string;
  tedarikciId: string;
  durum: SatinAlmaDurumu;
  kalemler: Array<{
    urunId: string;
    miktar: number;
    birimFiyat: number;
    kabulEdilenMiktar: number;
    faturalananMiktar: number;
  }>;
  kaynakBelgeId?: string;
  idempotencyKey: string;
}

const gecisler: Record<SatinAlmaDurumu, SatinAlmaDurumu[]> = {
  TALEP: ["TEDARIKCI_TEKLIFI", "SIPARIS", "IPTAL"],
  TEDARIKCI_TEKLIFI: ["SIPARIS", "IPTAL"],
  SIPARIS: ["MAL_KABUL", "FATURA", "IPTAL"],
  MAL_KABUL: ["FATURA", "TAMAMLANDI"],
  FATURA: ["TAMAMLANDI"],
  TAMAMLANDI: [],
  IPTAL: [],
};

export function satinAlmaGecisiUygunMu(
  mevcut: SatinAlmaDurumu,
  hedef: SatinAlmaDurumu
): boolean {
  return gecisler[mevcut].includes(hedef);
}

export function satinAlmaBelgesiDogrula(
  belge: SatinAlmaBelgesi
): void {
  if (!belge.belgeNo?.trim()) throw new Error("Belge numarası zorunlu.");
  if (!belge.tedarikciId?.trim()) throw new Error("Tedarikçi zorunlu.");
  if (!belge.idempotencyKey?.trim()) throw new Error("Idempotency key zorunlu.");
  if (!belge.kalemler.length) throw new Error("En az bir alış kalemi olmalı.");

  for (const k of belge.kalemler) {
    if (k.miktar <= 0 || k.birimFiyat < 0) {
      throw new Error("Miktar/fiyat geçersiz.");
    }
    if (k.kabulEdilenMiktar < 0 || k.kabulEdilenMiktar > k.miktar) {
      throw new Error("Kabul miktarı geçersiz.");
    }
    if (k.faturalananMiktar < 0 || k.faturalananMiktar > k.miktar) {
      throw new Error("Faturalanan miktar geçersiz.");
    }
  }
}

export function kalanMalKabul(
  miktar: number,
  kabul: number
): number {
  return Math.max(0, miktar - kabul);
}

export function kalanAlisFaturalama(
  miktar: number,
  faturalanan: number
): number {
  return Math.max(0, miktar - faturalanan);
}
