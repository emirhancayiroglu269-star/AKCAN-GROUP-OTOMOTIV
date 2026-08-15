export type BelgeTipi =
  | "SATIS_FATURA"
  | "ALIS_FATURA"
  | "SATIS_IADE"
  | "ALIS_IADE"
  | "SATIS_IPTAL"
  | "ALIS_IPTAL";

export type BelgeDurumu = "TASLAK" | "ONAYLI" | "IPTAL";

export interface BelgeKalemi {
  parcaId: string;
  aciklama?: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
  maliyet: number;
}

export interface TicariBelge {
  id: string;
  belgeNo: string;
  belgeTipi: BelgeTipi;
  durum: BelgeDurumu;
  tarih: string;
  musteriId?: string;
  tedarikciId?: string;
  kaynakBelgeId?: string;
  idempotencyKey: string;
  odemeYontemi?: "NAKIT" | "POS" | "HAVALE" | "ACIK_HESAP";
  kalemler: BelgeKalemi[];
  araToplam: number;
  kdvToplam: number;
  genelToplam: number;
}

export function belgeToplamHesapla(kalemler: BelgeKalemi[]) {
  if (!kalemler.length) throw new Error("Belgede en az bir kalem olmalı.");

  let araToplam = 0;
  let kdvToplam = 0;

  for (const k of kalemler) {
    if (!Number.isFinite(k.miktar) || k.miktar <= 0) {
      throw new Error("Miktar pozitif olmalı.");
    }
    if (!Number.isFinite(k.birimFiyat) || k.birimFiyat <= 0) {
      throw new Error("Birim fiyat pozitif olmalı.");
    }
    if (!Number.isFinite(k.kdvOrani) || k.kdvOrani < 0) {
      throw new Error("KDV oranı geçersiz.");
    }
    if (!Number.isFinite(k.maliyet) || k.maliyet < 0) {
      throw new Error("Maliyet geçersiz.");
    }

    const satir = k.miktar * k.birimFiyat;
    araToplam += satir;
    kdvToplam += satir * k.kdvOrani / 100;
  }

  return {
    araToplam,
    kdvToplam,
    genelToplam: araToplam + kdvToplam,
  };
}

export function belgeKaydetmeyeHazirla(
  belge: Omit<TicariBelge, "araToplam" | "kdvToplam" | "genelToplam">
): TicariBelge {
  if (!belge.belgeNo?.trim()) throw new Error("Belge numarası zorunlu.");
  if (!belge.idempotencyKey?.trim()) throw new Error("Idempotency key zorunlu.");

  const toplamlar = belgeToplamHesapla(belge.kalemler);

  return {
    ...belge,
    ...toplamlar,
  };
}
