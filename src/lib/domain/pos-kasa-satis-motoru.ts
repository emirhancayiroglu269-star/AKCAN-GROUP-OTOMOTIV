export type OdemeTipi =
  | "NAKIT"
  | "POS"
  | "HAVALE"
  | "ACIK_HESAP";

export interface SepetSatiri {
  urunId: string;
  stokKodu: string;
  urunAdi: string;
  miktar: number;
  birimFiyat: number;
  iskontoOrani: number;
  kdvOrani: number;
  maliyet: number;
}

export interface PosSatis {
  id: string;
  idempotencyKey: string;
  cariId?: string;
  odemeTipi: OdemeTipi;
  satirlar: SepetSatiri[];
}

export interface PosSatisOzeti {
  araToplam: number;
  iskontoToplam: number;
  kdvToplam: number;
  genelToplam: number;
  maliyet: number;
  brutKar: number;
}

export function posSatisHesapla(satis: PosSatis): PosSatisOzeti {
  if (!satis.idempotencyKey?.trim()) {
    throw new Error("Idempotency key zorunlu.");
  }
  if (!satis.satirlar.length) {
    throw new Error("Sepet boş.");
  }
  if (satis.odemeTipi === "ACIK_HESAP" && !satis.cariId) {
    throw new Error("Açık hesap satışında cari zorunlu.");
  }

  let araToplam = 0;
  let iskontoToplam = 0;
  let kdvToplam = 0;
  let maliyet = 0;

  for (const s of satis.satirlar) {
    if (!Number.isInteger(s.miktar) || s.miktar <= 0) {
      throw new Error("Miktar pozitif tam sayı olmalı.");
    }
    if (s.birimFiyat < 0 || s.maliyet < 0) {
      throw new Error("Fiyat/maliyet negatif olamaz.");
    }
    if (s.iskontoOrani < 0 || s.iskontoOrani > 100) {
      throw new Error("İskonto oranı 0-100 arasında olmalı.");
    }

    const brut = s.miktar * s.birimFiyat;
    const iskonto = brut * s.iskontoOrani / 100;
    const net = brut - iskonto;

    araToplam += brut;
    iskontoToplam += iskonto;
    kdvToplam += net * s.kdvOrani / 100;
    maliyet += s.miktar * s.maliyet;
  }

  const genelToplam = araToplam - iskontoToplam + kdvToplam;

  return {
    araToplam,
    iskontoToplam,
    kdvToplam,
    genelToplam,
    maliyet,
    brutKar: (araToplam - iskontoToplam) - maliyet,
  };
}

export function odemeHesabiSec(odeme: OdemeTipi) {
  switch (odeme) {
    case "NAKIT": return "KASA";
    case "POS": return "POS";
    case "HAVALE": return "BANKA";
    case "ACIK_HESAP": return "CARI";
  }
}
