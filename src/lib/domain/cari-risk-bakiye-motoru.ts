export type CariHareketTipi =
  | "SATIS"
  | "TAHSILAT"
  | "SATIS_IADE"
  | "BORC"
  | "ALACAK"
  | "DUZELTME";

export interface CariHareket {
  id: string;
  cariId: string;
  tip: CariHareketTipi;
  tutar: number;
  vadeTarihi?: string;
  belgeId?: string;
  tarih: string;
  idempotencyKey: string;
}

export interface CariRiskProfili {
  cariId: string;
  krediLimiti: number;
  mevcutBakiye: number;
  vadesiGecenBakiye: number;
  acikSiparisTutari: number;
  riskPuani: number;
}

export interface CariRiskSonucu {
  cariId: string;
  bakiye: number;
  kullanilabilirLimit: number;
  toplamRisk: number;
  vadesiGecen: number;
  durum: "GUVENLI" | "IZLE" | "RISKLI" | "LIMIT_ASIMI";
  satisOnayi: boolean;
  neden: string;
}

export function cariBakiyeHesapla(
  borclar: number,
  alacaklar: number
): number {
  if (borclar < 0 || alacaklar < 0) {
    throw new Error("Cari tutarlar negatif olamaz.");
  }
  return borclar - alacaklar;
}

export function cariRiskHesapla(
  p: CariRiskProfili
): CariRiskSonucu {
  if (p.krediLimiti < 0 || p.mevcutBakiye < 0 ||
      p.vadesiGecenBakiye < 0 || p.acikSiparisTutari < 0) {
    throw new Error("Risk değerleri negatif olamaz.");
  }

  const toplamRisk = p.mevcutBakiye + p.acikSiparisTutari;
  const kullanilabilirLimit = Math.max(0, p.krediLimiti - toplamRisk);

  let durum: CariRiskSonucu["durum"] = "GUVENLI";
  let satisOnayi = true;
  let neden = "Cari risk limiti içinde.";

  if (toplamRisk > p.krediLimiti) {
    durum = "LIMIT_ASIMI";
    satisOnayi = false;
    neden = "Toplam risk kredi limitini aşıyor.";
  } else if (p.vadesiGecenBakiye > 0) {
    durum = "RISKLI";
    satisOnayi = false;
    neden = "Vadesi geçmiş bakiye bulunuyor.";
  } else if (toplamRisk >= p.krediLimiti * 0.8) {
    durum = "IZLE";
    neden = "Risk limiti %80 seviyesini geçti.";
  }

  return {
    cariId: p.cariId,
    bakiye: p.mevcutBakiye,
    kullanilabilirLimit,
    toplamRisk,
    vadesiGecen: p.vadesiGecenBakiye,
    durum,
    satisOnayi,
    neden,
  };
}

export function vadeyeKalanGun(
  vadeTarihi: string,
  bugun = new Date()
): number {
  const vade = new Date(vadeTarihi);
  if (Number.isNaN(vade.getTime())) throw new Error("Vade tarihi geçersiz.");
  return Math.ceil((vade.getTime() - bugun.getTime()) / 86400000);
}
