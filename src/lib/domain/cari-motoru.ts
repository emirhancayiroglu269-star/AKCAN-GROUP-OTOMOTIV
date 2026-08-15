export type CariTipi = "MUSTERI" | "TEDARIKCI";

export type CariHareketTipi =
  | "SATIS"
  | "ALIS"
  | "TAHSILAT"
  | "ODEME"
  | "IADE"
  | "IPTAL"
  | "DUZELTME";

export interface CariHareket {
  id: string;
  cariId: string;
  cariTipi: CariTipi;
  tip: CariHareketTipi;
  tutar: number;
  kaynakIslemId: string;
  idempotencyKey: string;
  tarih: string;
  aciklama?: string;
}

export interface CariBakiye {
  borc: number;
  alacak: number;
  bakiye: number;
}

export function cariHareketKontrolu(hareket: Omit<CariHareket, "id">) {
  if (!hareket.cariId?.trim()) throw new Error("Cari zorunlu.");
  if (!hareket.kaynakIslemId?.trim()) throw new Error("Kaynak işlem zorunlu.");
  if (!hareket.idempotencyKey?.trim()) throw new Error("Idempotency key zorunlu.");
  if (!Number.isFinite(hareket.tutar) || hareket.tutar <= 0) {
    throw new Error("Cari tutarı sıfırdan büyük olmalı.");
  }
  return true;
}

export function cariBakiyeHesapla(
  hareketler: Array<Pick<CariHareket, "cariTipi" | "tip" | "tutar">>
): CariBakiye {
  let borc = 0;
  let alacak = 0;

  for (const h of hareketler) {
    if (h.tutar <= 0) throw new Error("Geçersiz cari tutarı.");

    const musteri = h.cariTipi === "MUSTERI";

    if (
      (musteri && ["SATIS", "TAHSILAT"].includes(h.tip)) ||
      (!musteri && ["ALIS", "ODEME"].includes(h.tip))
    ) {
      alacak += h.tutar;
    } else {
      borc += h.tutar;
    }
  }

  return {
    borc,
    alacak,
    bakiye: alacak - borc,
  };
}
