export type ParaHesabiTipi = "KASA" | "BANKA" | "POS";

export type FinansHareketTipi =
  | "GIRIS"
  | "CIKIS"
  | "TRANSFER"
  | "TAHSILAT"
  | "ODEME"
  | "POS_SATIS"
  | "POS_KESINTI"
  | "DUZELTME";

export interface ParaHesabi {
  id: string;
  ad: string;
  tip: ParaHesabiTipi;
  paraBirimi: "TRY" | "USD" | "EUR";
  sistemBakiyesi: number;
  aktif: boolean;
}

export interface FinansHareketi {
  id: string;
  hesapId: string;
  tip: FinansHareketTipi;
  tutar: number;
  tarih: string;
  belgeId?: string;
  idempotencyKey: string;
}

export interface MutabakatSonucu {
  hesapId: string;
  sistemBakiyesi: number;
  sayilanBakiye: number;
  fark: number;
  durum: "TAM" | "EKSIK" | "FAZLA";
}

export function finansHareketDogrula(h: FinansHareketi): void {
  if (!h.hesapId?.trim()) throw new Error("Hesap zorunlu.");
  if (!h.tip) throw new Error("Hareket tipi zorunlu.");
  if (!Number.isFinite(h.tutar) || h.tutar <= 0) {
    throw new Error("Hareket tutarı pozitif olmalı.");
  }
  if (!h.idempotencyKey?.trim()) {
    throw new Error("Idempotency key zorunlu.");
  }
}

export function hareketNetEtkisi(
  tip: FinansHareketTipi,
  tutar: number
): number {
  if (tutar < 0) throw new Error("Tutar negatif olamaz.");

  switch (tip) {
    case "GIRIS":
    case "TAHSILAT":
    case "POS_SATIS":
      return tutar;
    case "CIKIS":
    case "ODEME":
    case "POS_KESINTI":
      return -tutar;
    case "TRANSFER":
    case "DUZELTME":
      return 0;
  }
}

export function mutabakatHesapla(
  hesapId: string,
  sistemBakiyesi: number,
  sayilanBakiye: number
): MutabakatSonucu {
  if (sistemBakiyesi < 0 || sayilanBakiye < 0) {
    throw new Error("Bakiyeler negatif olamaz.");
  }

  const fark = sayilanBakiye - sistemBakiyesi;

  return {
    hesapId,
    sistemBakiyesi,
    sayilanBakiye,
    fark,
    durum: fark === 0 ? "TAM" : fark < 0 ? "EKSIK" : "FAZLA",
  };
}

export function posNetTutar(
  satisTutari: number,
  komisyon: number
): number {
  if (satisTutari < 0 || komisyon < 0 || komisyon > satisTutari) {
    throw new Error("POS tutarları geçersiz.");
  }
  return satisTutari - komisyon;
}

export function hesapTransferi(
  kaynakBakiye: number,
  tutar: number
): { kaynak: number; hedef: number } {
  if (kaynakBakiye < 0 || tutar <= 0 || tutar > kaynakBakiye) {
    throw new Error("Transfer tutarı geçersiz.");
  }
  return {
    kaynak: kaynakBakiye - tutar,
    hedef: tutar,
  };
}
