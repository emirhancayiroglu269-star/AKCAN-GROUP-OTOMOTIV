export interface MutabakatBeklenen {
  stok: number;
  kasa: number;
  banka: number;
  pos: number;
  cari: number;
  kdv: number;
  maliyet: number;
  brutKar: number;
}

export interface MutabakatGerceklesen extends MutabakatBeklenen {}

export interface MutabakatSonucu {
  ok: boolean;
  farklar: Partial<MutabakatBeklenen>;
  hata?: string;
}

const alanlar: (keyof MutabakatBeklenen)[] = [
  "stok", "kasa", "banka", "pos", "cari", "kdv", "maliyet", "brutKar"
];

export function mutabakatKontrolu(
  beklenen: MutabakatBeklenen,
  gerceklesen: MutabakatGerceklesen,
  tolerans = 0.01
): MutabakatSonucu {
  const farklar: Partial<MutabakatBeklenen> = {};

  for (const alan of alanlar) {
    const fark = Number(gerceklesen[alan]) - Number(beklenen[alan]);
    if (Math.abs(fark) > tolerans) {
      farklar[alan] = fark;
    }
  }

  const ok = Object.keys(farklar).length === 0;

  return {
    ok,
    farklar,
    hata: ok ? undefined : "İşlem mutabakatı başarısız."
  };
}

export function roundTripMutabakat(
  ilk: MutabakatBeklenen,
  ters: MutabakatBeklenen,
  tolerans = 0.01
): MutabakatSonucu {
  const toplam = {} as MutabakatBeklenen;

  for (const alan of alanlar) {
    toplam[alan] = Number(ilk[alan]) + Number(ters[alan]);
  }

  const sifir = {
    stok: 0, kasa: 0, banka: 0, pos: 0,
    cari: 0, kdv: 0, maliyet: 0, brutKar: 0
  };

  return mutabakatKontrolu(sifir, toplam, tolerans);
}
