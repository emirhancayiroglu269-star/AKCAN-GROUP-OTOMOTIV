export interface FinansalDashboardGirdisi {
  donem: string;
  ciro: number;
  satilanMaliyet: number;
  faaliyetGideri: number;
  toplamTahsilat: number;
  toplamBorc: number;
  nakit: number;
  banka: number;
  pos: number;
  stokMaliyeti: number;
  hesaplananKdv?: number;
}

export interface FinansalDashboardSonucu {
  donem: string;
  ciro: number;
  satilanMaliyet: number;
  brutKar: number;
  brutMarj: number;
  faaliyetGideri: number;
  netFaaliyetKari: number;
  toplamTahsilat: number;
  toplamBorc: number;
  nakitToplami: number;
  stoktaBagliPara: number;
  hesaplananKdv: number;
  netLikidite: number;
}

export function finansalDashboardHesapla(
  g: FinansalDashboardGirdisi
): FinansalDashboardSonucu {
  const values = [
    g.ciro, g.satilanMaliyet, g.faaliyetGideri, g.toplamTahsilat,
    g.toplamBorc, g.nakit, g.banka, g.pos, g.stokMaliyeti,
    g.hesaplananKdv ?? 0
  ];

  if (values.some(v => !Number.isFinite(v) || v < 0)) {
    throw new Error("Finansal değerler geçersiz.");
  }

  const brutKar = g.ciro - g.satilanMaliyet;
  const brutMarj = g.ciro === 0 ? 0 : (brutKar / g.ciro) * 100;
  const netFaaliyetKari = brutKar - g.faaliyetGideri;
  const nakitToplami = g.nakit + g.banka + g.pos;
  const netLikidite = nakitToplami - g.toplamBorc;

  return {
    donem: g.donem,
    ciro: g.ciro,
    satilanMaliyet: g.satilanMaliyet,
    brutKar,
    brutMarj,
    faaliyetGideri: g.faaliyetGideri,
    netFaaliyetKari,
    toplamTahsilat: g.toplamTahsilat,
    toplamBorc: g.toplamBorc,
    nakitToplami,
    stoktaBagliPara: g.stokMaliyeti,
    hesaplananKdv: g.hesaplananKdv ?? 0,
    netLikidite,
  };
}

export function karMarjDurumu(
  brutMarj: number,
  netFaaliyetKari: number
): "COK_IYI" | "IYI" | "IZLE" | "ZARAR" {
  if (netFaaliyetKari < 0) return "ZARAR";
  if (brutMarj >= 30 && netFaaliyetKari > 0) return "COK_IYI";
  if (brutMarj >= 20) return "IYI";
  return "IZLE";
}
