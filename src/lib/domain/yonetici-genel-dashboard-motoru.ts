export interface YoneticiDashboardGirdisi {
  ciro: number;
  brutKar: number;
  netFaaliyetKari: number;
  toplamGider: number;
  toplamTahsilat: number;
  toplamBorc: number;
  nakit: number;
  stoktaBagliPara: number;
  alinacakUrunSayisi: number;
  onerilenAlimAdedi: number;
  gecikenCariSayisi: number;
  kritikStokSayisi: number;
  oluStokSayisi: number;
}

export interface YoneticiDashboardSonucu {
  finans: {
    ciro: number;
    brutKar: number;
    netFaaliyetKari: number;
    toplamGider: number;
    brutMarj: number;
    netMarj: number;
  };
  nakit: {
    toplam: number;
    toplamBorc: number;
    netLikidite: number;
    toplamTahsilat: number;
  };
  stok: {
    stoktaBagliPara: number;
    alinacakUrunSayisi: number;
    onerilenAlimAdedi: number;
    kritikStokSayisi: number;
    oluStokSayisi: number;
  };
  cari: {
    gecikenCariSayisi: number;
  };
  uyariSayisi: number;
}

export function yoneticiDashboardHesapla(
  g: YoneticiDashboardGirdisi
): YoneticiDashboardSonucu {
  const values = Object.values(g);
  if (values.some(v => !Number.isFinite(v) || v < 0)) {
    throw new Error("Dashboard girdileri geçersiz.");
  }

  const brutMarj = g.ciro === 0 ? 0 : (g.brutKar / g.ciro) * 100;
  const netMarj = g.ciro === 0 ? 0 : (g.netFaaliyetKari / g.ciro) * 100;
  const toplamNakit = g.nakit;
  const netLikidite = toplamNakit - g.toplamBorc;

  const uyariSayisi =
    g.gecikenCariSayisi +
    g.kritikStokSayisi +
    g.oluStokSayisi;

  return {
    finans: {
      ciro: g.ciro,
      brutKar: g.brutKar,
      netFaaliyetKari: g.netFaaliyetKari,
      toplamGider: g.toplamGider,
      brutMarj,
      netMarj,
    },
    nakit: {
      toplam: toplamNakit,
      toplamBorc: g.toplamBorc,
      netLikidite,
      toplamTahsilat: g.toplamTahsilat,
    },
    stok: {
      stoktaBagliPara: g.stoktaBagliPara,
      alinacakUrunSayisi: g.alinacakUrunSayisi,
      onerilenAlimAdedi: g.onerilenAlimAdedi,
      kritikStokSayisi: g.kritikStokSayisi,
      oluStokSayisi: g.oluStokSayisi,
    },
    cari: {
      gecikenCariSayisi: g.gecikenCariSayisi,
    },
    uyariSayisi,
  };
}
