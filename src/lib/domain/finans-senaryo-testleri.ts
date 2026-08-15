export interface SenaryoBeklentisi {
  ad: string;
  satis: number;
  odeme: number;
  stokDelta: number;
  cariDelta: number;
  hesapDelta: number;
  kdv: number;
  maliyet: number;
  brutKar: number;
  tekrarIslemEngellenmeli?: boolean;
}

export interface SenaryoSonucu {
  ad: string;
  ok: boolean;
  hatalar: string[];
}

const yakin = (a: number, b: number) => Math.abs(a - b) <= 0.01;

export function senaryoDogrula(
  beklenen: SenaryoBeklentisi,
  gercek: Omit<SenaryoBeklentisi, "ad" | "tekrarIslemEngellenmeli"> & {
    tekrarIslemEngellendi?: boolean;
  }
): SenaryoSonucu {
  const hatalar: string[] = [];

  const kontroller: Array<[string, number, number]> = [
    ["satış", beklenen.satis, gercek.satis],
    ["ödeme", beklenen.odeme, gercek.odeme],
    ["stok", beklenen.stokDelta, gercek.stokDelta],
    ["cari", beklenen.cariDelta, gercek.cariDelta],
    ["hesap", beklenen.hesapDelta, gercek.hesapDelta],
    ["KDV", beklenen.kdv, gercek.kdv],
    ["maliyet", beklenen.maliyet, gercek.maliyet],
    ["brüt kâr", beklenen.brutKar, gercek.brutKar],
  ];

  for (const [alan, beklenenDeger, gercekDeger] of kontroller) {
    if (!yakin(beklenenDeger, gercekDeger)) {
      hatalar.push(`${alan}: beklenen=${beklenenDeger}, gerçek=${gercekDeger}`);
    }
  }

  if (
    beklenen.tekrarIslemEngellenmeli &&
    gercek.tekrarIslemEngellendi !== true
  ) {
    hatalar.push("Çift kayıt denemesi engellenmedi.");
  }

  return { ad: beklenen.ad, ok: hatalar.length === 0, hatalar };
}

/**
 * Test verileri muhasebe kaydı değildir; yalnızca deterministik beklenti setidir.
 * Üretim verisine dokunmaz.
 */
export const STANDART_SENARYOLAR: SenaryoBeklentisi[] = [
  {
    ad: "Normal peşin satış",
    satis: 12000,
    odeme: 12000,
    stokDelta: -10,
    cariDelta: 0,
    hesapDelta: 12000,
    kdv: 2000,
    maliyet: 7000,
    brutKar: 3000,
  },
  {
    ad: "Kredi kartı satış",
    satis: 12000,
    odeme: 12000,
    stokDelta: -10,
    cariDelta: 0,
    hesapDelta: 12000,
    kdv: 2000,
    maliyet: 7000,
    brutKar: 3000,
  },
  {
    ad: "Açık hesap satış",
    satis: 12000,
    odeme: 0,
    stokDelta: -10,
    cariDelta: 12000,
    hesapDelta: 0,
    kdv: 2000,
    maliyet: 7000,
    brutKar: 3000,
  },
  {
    ad: "Peşin alış",
    satis: 0,
    odeme: 8000,
    stokDelta: 10,
    cariDelta: 0,
    hesapDelta: -8000,
    kdv: 1333.33,
    maliyet: 6666.67,
    brutKar: 0,
  },
  {
    ad: "Vadeli alış",
    satis: 0,
    odeme: 0,
    stokDelta: 10,
    cariDelta: -8000,
    hesapDelta: 0,
    kdv: 1333.33,
    maliyet: 6666.67,
    brutKar: 0,
  },
  {
    ad: "Kısmi ödeme",
    satis: 12000,
    odeme: 5000,
    stokDelta: -10,
    cariDelta: 7000,
    hesapDelta: 5000,
    kdv: 2000,
    maliyet: 7000,
    brutKar: 3000,
  },
  {
    ad: "Tam iade",
    satis: -12000,
    odeme: -12000,
    stokDelta: 10,
    cariDelta: 0,
    hesapDelta: -12000,
    kdv: -2000,
    maliyet: -7000,
    brutKar: -3000,
  },
  {
    ad: "Kısmi iade",
    satis: -6000,
    odeme: -6000,
    stokDelta: 5,
    cariDelta: 0,
    hesapDelta: -6000,
    kdv: -1000,
    maliyet: -3500,
    brutKar: -1500,
  },
  {
    ad: "Satış iptali",
    satis: -12000,
    odeme: -12000,
    stokDelta: 10,
    cariDelta: 0,
    hesapDelta: -12000,
    kdv: -2000,
    maliyet: -7000,
    brutKar: -3000,
  },
  {
    ad: "Çift kayıt denemesi",
    satis: 12000,
    odeme: 12000,
    stokDelta: -10,
    cariDelta: 0,
    hesapDelta: 12000,
    kdv: 2000,
    maliyet: 7000,
    brutKar: 3000,
    tekrarIslemEngellenmeli: true,
  },
];
