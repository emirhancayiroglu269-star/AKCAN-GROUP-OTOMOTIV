export type RaporDonemi = "GUNLUK" | "HAFTALIK" | "AYLIK" | "YILLIK";

export interface RaporGirdisi {
  donem: RaporDonemi;
  ciro: number;
  satilanMaliyet: number;
  brutKar: number;
  gider: number;
  netFaaliyetKari: number;
  tahsilat: number;
  borc: number;
  stokDegeri: number;
  satinAlma: number;
  satisAdedi: number;
  siparisAdedi: number;
}

export interface RaporSonucu {
  donem: RaporDonemi;
  ciro: number;
  brutKar: number;
  brutMarj: number;
  gider: number;
  netFaaliyetKari: number;
  netMarj: number;
  tahsilat: number;
  borc: number;
  stokDegeri: number;
  satinAlma: number;
  satisAdedi: number;
  siparisAdedi: number;
}

export function raporOlustur(g: RaporGirdisi): RaporSonucu {
  const values = Object.values(g).filter(v => typeof v === "number") as number[];
  if (values.some(v => !Number.isFinite(v) || v < 0)) {
    throw new Error("Rapor girdileri geçersiz.");
  }

  return {
    donem: g.donem,
    ciro: g.ciro,
    brutKar: g.brutKar,
    brutMarj: g.ciro === 0 ? 0 : (g.brutKar / g.ciro) * 100,
    gider: g.gider,
    netFaaliyetKari: g.netFaaliyetKari,
    netMarj: g.ciro === 0 ? 0 : (g.netFaaliyetKari / g.ciro) * 100,
    tahsilat: g.tahsilat,
    borc: g.borc,
    stokDegeri: g.stokDegeri,
    satinAlma: g.satinAlma,
    satisAdedi: g.satisAdedi,
    siparisAdedi: g.siparisAdedi,
  };
}

export function donemKarsilastir(
  mevcut: RaporSonucu,
  onceki: RaporSonucu
) {
  const degisim = (a: number, b: number) =>
    b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / b) * 100;

  return {
    ciroYuzde: degisim(mevcut.ciro, onceki.ciro),
    brutKarYuzde: degisim(mevcut.brutKar, onceki.brutKar),
    netKarYuzde: degisim(mevcut.netFaaliyetKari, onceki.netFaaliyetKari),
    tahsilatYuzde: degisim(mevcut.tahsilat, onceki.tahsilat),
    giderYuzde: degisim(mevcut.gider, onceki.gider),
    satisAdediYuzde: degisim(mevcut.satisAdedi, onceki.satisAdedi),
  };
}
