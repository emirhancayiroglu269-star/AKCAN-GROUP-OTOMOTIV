export type TahsilatDurumu =
  | "BEKLIYOR"
  | "KISMEN_TAHSIL"
  | "TAHSIL_EDILDI"
  | "GECIKTI"
  | "IPTAL";

export interface OdemePlaniTaksit {
  id: string;
  cariId: string;
  belgeId?: string;
  vadeTarihi: string;
  tutar: number;
  tahsilEdilen: number;
  durum: TahsilatDurumu;
}

export interface Tahsilat {
  id: string;
  cariId: string;
  taksitId?: string;
  tarih: string;
  tutar: number;
  yontem: "NAKIT" | "POS" | "HAVALE" | "CEK" | "SENET";
  idempotencyKey: string;
}

export function kalanTaksit(
  tutar: number,
  tahsilEdilen: number
): number {
  if (tutar < 0 || tahsilEdilen < 0 || tahsilEdilen > tutar) {
    throw new Error("Taksit/tahsilat tutarı geçersiz.");
  }
  return tutar - tahsilEdilen;
}

export function tahsilatDurumu(
  tutar: number,
  tahsilEdilen: number,
  vadeTarihi: string,
  bugun = new Date()
): TahsilatDurumu {
  const kalan = kalanTaksit(tutar, tahsilEdilen);
  if (kalan === 0) return "TAHSIL_EDILDI";

  const vade = new Date(vadeTarihi);
  if (Number.isNaN(vade.getTime())) throw new Error("Vade tarihi geçersiz.");

  if (bugun.getTime() > vade.getTime()) {
    return tahsilEdilen > 0 ? "KISMEN_TAHSIL" : "GECIKTI";
  }

  return tahsilEdilen > 0 ? "KISMEN_TAHSIL" : "BEKLIYOR";
}

export function tahsilatUygunMu(
  taksitTutari: number,
  tahsilEdilen: number,
  yeniTahsilat: number
): boolean {
  if (yeniTahsilat <= 0) return false;
  return tahsilEdilen + yeniTahsilat <= taksitTutari;
}

export function gecikenTaksitleriBul(
  taksitler: OdemePlaniTaksit[],
  bugun = new Date()
): OdemePlaniTaksit[] {
  return taksitler.filter(t => {
    const kalan = kalanTaksit(t.tutar, t.tahsilEdilen);
    return kalan > 0 && new Date(t.vadeTarihi).getTime() < bugun.getTime();
  });
}

export function tahsilatOzetle(taksitler: OdemePlaniTaksit[]) {
  const toplam = taksitler.reduce((s, t) => s + t.tutar, 0);
  const tahsil = taksitler.reduce((s, t) => s + t.tahsilEdilen, 0);
  const kalan = toplam - tahsil;
  const geciken = taksitler.filter(t => t.durum === "GECIKTI")
    .reduce((s, t) => s + kalanTaksit(t.tutar, t.tahsilEdilen), 0);

  return { toplam, tahsil, kalan, geciken };
}
