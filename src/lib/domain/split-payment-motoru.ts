export type SplitOdemeTipi = "NAKIT" | "POS" | "HAVALE" | "ACIK_HESAP";

export interface OdemeParcasi {
  tip: SplitOdemeTipi;
  tutar: number;
  hesapId?: string;
  cariId?: string;
}

export interface SplitOdemeSonucu {
  ok: boolean;
  toplamOdeme: number;
  kalan: number;
  parcalar: OdemeParcasi[];
  hata?: string;
}

export function splitOdemeHesapla(
  satisToplami: number,
  odemeler: OdemeParcasi[],
  tolerans = 0.01
): SplitOdemeSonucu {
  if (!Number.isFinite(satisToplami) || satisToplami <= 0) {
    return { ok: false, toplamOdeme: 0, kalan: satisToplami,
      parcalar: [], hata: "Satış toplamı geçersiz." };
  }

  if (!odemeler.length) {
    return { ok: false, toplamOdeme: 0, kalan: satisToplami,
      parcalar: [], hata: "En az bir ödeme girilmeli." };
  }

  let toplamOdeme = 0;

  for (const o of odemeler) {
    if (!Number.isFinite(o.tutar) || o.tutar <= 0) {
      return { ok: false, toplamOdeme, kalan: satisToplami - toplamOdeme,
        parcalar: odemeler, hata: "Ödeme tutarı pozitif olmalı." };
    }

    if (o.tip === "ACIK_HESAP" && !o.cariId) {
      return { ok: false, toplamOdeme, kalan: satisToplami - toplamOdeme,
        parcalar: odemeler, hata: "Açık hesap ödemesinde cari zorunlu." };
    }

    toplamOdeme += o.tutar;
  }

  const kalan = satisToplami - toplamOdeme;

  if (Math.abs(kalan) > tolerans) {
    return {
      ok: false,
      toplamOdeme,
      kalan,
      parcalar: odemeler,
      hata: kalan > 0 ? "Eksik ödeme." : "Fazla ödeme."
    };
  }

  return {
    ok: true,
    toplamOdeme,
    kalan: 0,
    parcalar: odemeler
  };
}
