export interface SimBakiye {
  stok: number;
  kasa: number;
  cari: number;
  kdv: number;
  maliyet: number;
  brutKar: number;
}

export interface SimIslem {
  ad: string;
  stokDelta: number;
  kasaDelta: number;
  cariDelta: number;
  kdvDelta: number;
  maliyetDelta: number;
  brutKarDelta: number;
}

export interface SimTestSonucu {
  ad: string;
  ok: boolean;
  baslangic: SimBakiye;
  bitis: SimBakiye;
  beklenen: SimBakiye;
  hatalar: string[];
}

const yakin = (a: number, b: number) => Math.abs(a - b) <= 0.01;

export function simulasyonUygula(
  baslangic: SimBakiye,
  islem: SimIslem
): SimBakiye {
  return {
    stok: baslangic.stok + islem.stokDelta,
    kasa: baslangic.kasa + islem.kasaDelta,
    cari: baslangic.cari + islem.cariDelta,
    kdv: baslangic.kdv + islem.kdvDelta,
    maliyet: baslangic.maliyet + islem.maliyetDelta,
    brutKar: baslangic.brutKar + islem.brutKarDelta,
  };
}

export function simulasyonDogrula(
  baslangic: SimBakiye,
  islem: SimIslem,
  beklenen: SimBakiye
): SimTestSonucu {
  const bitis = simulasyonUygula(baslangic, islem);
  const hatalar: string[] = [];

  for (const key of ["stok", "kasa", "cari", "kdv", "maliyet", "brutKar"] as const) {
    if (!yakin(bitis[key], beklenen[key])) {
      hatalar.push(`${key}: beklenen=${beklenen[key]}, gerçek=${bitis[key]}`);
    }
  }

  return {
    ad: islem.ad,
    ok: hatalar.length === 0,
    baslangic,
    bitis,
    beklenen,
    hatalar,
  };
}

export function standartE2ESimulasyonlar(): SimTestSonucu[] {
  const baslangic: SimBakiye = {
    stok: 100,
    kasa: 50000,
    cari: 0,
    kdv: 0,
    maliyet: 0,
    brutKar: 0,
  };

  const senaryolar: Array<[SimIslem, SimBakiye]> = [
    [
      { ad: "Peşin satış", stokDelta: -10, kasaDelta: 12000, cariDelta: 0, kdvDelta: 2000, maliyetDelta: 7000, brutKarDelta: 3000 },
      { stok: 90, kasa: 62000, cari: 0, kdv: 2000, maliyet: 7000, brutKar: 3000 },
    ],
    [
      { ad: "Açık hesap satış", stokDelta: -10, kasaDelta: 0, cariDelta: 12000, kdvDelta: 2000, maliyetDelta: 7000, brutKarDelta: 3000 },
      { stok: 90, kasa: 50000, cari: 12000, kdv: 2000, maliyet: 7000, brutKar: 3000 },
    ],
    [
      { ad: "Peşin alış", stokDelta: 10, kasaDelta: -8000, cariDelta: 0, kdvDelta: 1333.33, maliyetDelta: 6666.67, brutKarDelta: 0 },
      { stok: 110, kasa: 42000, cari: 0, kdv: 1333.33, maliyet: 6666.67, brutKar: 0 },
    ],
    [
      { ad: "Kısmi ödeme", stokDelta: -10, kasaDelta: 5000, cariDelta: 7000, kdvDelta: 2000, maliyetDelta: 7000, brutKarDelta: 3000 },
      { stok: 90, kasa: 55000, cari: 7000, kdv: 2000, maliyet: 7000, brutKar: 3000 },
    ],
    [
      { ad: "Tam iade", stokDelta: 10, kasaDelta: -12000, cariDelta: 0, kdvDelta: -2000, maliyetDelta: -7000, brutKarDelta: -3000 },
      { stok: 110, kasa: 38000, cari: 0, kdv: -2000, maliyet: -7000, brutKar: -3000 },
    ],
  ];

  return senaryolar.map(([islem, beklenen]) =>
    simulasyonDogrula(baslangic, islem, beklenen)
  );
}
