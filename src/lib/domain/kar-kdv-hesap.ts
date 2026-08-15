export interface KarKdvSonucu {
  netSatis: number;
  kdv: number;
  toplamSatis: number;
  maliyet: number;
  brutKar: number;
  brutKarMarji: number;
}

const para = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function satisKarKdvHesapla(input: {
  toplamSatis: number;
  maliyet: number;
  kdvOrani?: number;
  toplamSatisKdvDahil?: boolean;
}): KarKdvSonucu {
  const toplamSatis = Math.max(0, para(input.toplamSatis));
  const maliyet = Math.max(0, para(input.maliyet));
  const oran = Math.max(0, para(input.kdvOrani ?? 20)) / 100;
  const netSatis = input.toplamSatisKdvDahil
    ? para(toplamSatis / (1 + oran))
    : toplamSatis;
  const kdv = input.toplamSatisKdvDahil
    ? para(toplamSatis - netSatis)
    : para(netSatis * oran);
  const brutKar = para(netSatis - maliyet);
  const brutKarMarji = netSatis > 0 ? para(brutKar / netSatis * 100) : 0;
  return { netSatis, kdv, toplamSatis, maliyet, brutKar, brutKarMarji };
}

export function iadeKarKdvTersHareket(input: {
  iadeToplami: number;
  iadeMaliyeti: number;
  kdvOrani?: number;
  iadeKdvDahil?: boolean;
}): KarKdvSonucu {
  const s = satisKarKdvHesapla({
    toplamSatis: input.iadeToplami,
    maliyet: input.iadeMaliyeti,
    kdvOrani: input.kdvOrani,
    toplamSatisKdvDahil: input.iadeKdvDahil,
  });
  return {
    netSatis: -s.netSatis,
    kdv: -s.kdv,
    toplamSatis: -s.toplamSatis,
    maliyet: -s.maliyet,
    brutKar: -s.brutKar,
    brutKarMarji: s.brutKarMarji,
  };
}
