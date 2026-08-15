export type FinansHesapTipi = "KASA" | "BANKA" | "POS" | "CARI";

export type FinansHareketTipi =
  | "TAHSILAT"
  | "ODEME"
  | "SATIS"
  | "ALIS"
  | "IADE"
  | "IPTAL"
  | "TRANSFER"
  | "DUZELTME";

export interface FinansHareket {
  id: string;
  hesapId: string;
  hesapTipi: FinansHesapTipi;
  tip: FinansHareketTipi;
  tutar: number;
  kaynakIslemId?: string;
  cariId?: string;
  idempotencyKey: string;
  tarih: string;
  aciklama?: string;
}

export interface FinansZincirSonucu {
  ok: boolean;
  kasaDegisimi: number;
  bankaDegisimi: number;
  posDegisimi: number;
  cariDegisimi: number;
  hata?: string;
}

function tutarKontrol(tutar: number) {
  if (!Number.isFinite(tutar) || tutar <= 0) {
    throw new Error("Finans tutarı sıfırdan büyük olmalı.");
  }
  return tutar;
}

export function finansHareketiOlustur(
  hareket: Omit<FinansHareket, "id">
): FinansHareket {
  tutarKontrol(hareket.tutar);

  if (!hareket.idempotencyKey?.trim()) {
    throw new Error("Idempotency key zorunlu.");
  }

  if (!hareket.kaynakIslemId?.trim()) {
    throw new Error("Kaynak işlem zorunlu.");
  }

  return {
    ...hareket,
    id: crypto.randomUUID(),
  };
}

export function finansZincirHesapla(
  hesapTipi: FinansHesapTipi,
  hareketTipi: FinansHareketTipi,
  tutar: number
): FinansZincirSonucu {
  tutarKontrol(tutar);

  const giris =
    hareketTipi === "TAHSILAT" ||
    hareketTipi === "SATIS" ||
    hareketTipi === "IADE";

  const katsayi = giris ? 1 : -1;

  return {
    ok: true,
    kasaDegisimi: hesapTipi === "KASA" ? katsayi * tutar : 0,
    bankaDegisimi: hesapTipi === "BANKA" ? katsayi * tutar : 0,
    posDegisimi: hesapTipi === "POS" ? katsayi * tutar : 0,
    cariDegisimi: hesapTipi === "CARI" ? katsayi * tutar : 0,
  };
}
