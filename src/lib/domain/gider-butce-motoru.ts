export type GiderKategori =
  | "KIRA"
  | "PERSONEL"
  | "ELEKTRIK"
  | "SU"
  | "INTERNET"
  | "TELEFON"
  | "KARGO"
  | "NAKLIYE"
  | "VERGI"
  | "MUHASEBE"
  | "PAZARLAMA"
  | "BANKA_POS"
  | "BAKIM"
  | "DIGER";

export interface Gider {
  id: string;
  kategori: GiderKategori;
  aciklama: string;
  tutar: number;
  tarih: string;
  vadeTarihi?: string;
  hesapId?: string;
  belgeId?: string;
  sabitMi: boolean;
  idempotencyKey: string;
}

export interface ButceKalemi {
  kategori: GiderKategori;
  aylikButce: number;
  gerceklesen: number;
}

export interface GiderAnaliz {
  toplamGider: number;
  sabitGider: number;
  degiskenGider: number;
  butce: number;
  butceFarki: number;
  butceKullanimYuzdesi: number;
}

export function giderDogrula(g: Gider): void {
  if (!g.kategori) throw new Error("Gider kategorisi zorunlu.");
  if (!g.aciklama?.trim()) throw new Error("Gider açıklaması zorunlu.");
  if (!Number.isFinite(g.tutar) || g.tutar <= 0) {
    throw new Error("Gider tutarı pozitif olmalı.");
  }
  if (!g.tarih || Number.isNaN(new Date(g.tarih).getTime())) {
    throw new Error("Gider tarihi geçersiz.");
  }
  if (!g.idempotencyKey?.trim()) {
    throw new Error("Idempotency key zorunlu.");
  }
}

export function giderAnalizi(
  giderler: Gider[],
  butceKalemleri: ButceKalemi[]
): GiderAnaliz {
  const toplamGider = giderler.reduce((s, g) => s + g.tutar, 0);
  const sabitGider = giderler
    .filter(g => g.sabitMi)
    .reduce((s, g) => s + g.tutar, 0);
  const degiskenGider = toplamGider - sabitGider;
  const butce = butceKalemleri.reduce((s, b) => s + b.aylikButce, 0);
  const butceFarki = butce - toplamGider;
  const butceKullanimYuzdesi = butce === 0 ? 0 : (toplamGider / butce) * 100;

  return {
    toplamGider,
    sabitGider,
    degiskenGider,
    butce,
    butceFarki,
    butceKullanimYuzdesi,
  };
}

export function butceSapmasi(
  butce: number,
  gerceklesen: number
): number {
  if (butce < 0 || gerceklesen < 0) {
    throw new Error("Bütçe değerleri negatif olamaz.");
  }
  return gerceklesen - butce;
}

export function giderOrani(
  gider: number,
  ciro: number
): number {
  if (gider < 0 || ciro < 0) throw new Error("Tutarlar negatif olamaz.");
  return ciro === 0 ? 0 : (gider / ciro) * 100;
}
