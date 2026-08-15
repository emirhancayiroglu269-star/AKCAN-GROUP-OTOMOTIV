export interface FinansBakiye {
  stok: number;
  kasa: number;
  cari: number;
  kdv: number;
  maliyet: number;
  brutKar: number;
}

export interface AtomikIslem {
  idempotencyKey: string;
  baslangic: FinansBakiye;
  degisim: Partial<FinansBakiye>;
}

export interface AtomikIslemSonucu {
  ok: boolean;
  idempotencyKey: string;
  tekrarMi: boolean;
  onceki?: FinansBakiye;
  sonraki?: FinansBakiye;
  hata?: string;
}

const n = (v: number | undefined) => Number.isFinite(v) ? Number(v) : 0;

export function atomikFinansIslemi(input: AtomikIslem): AtomikIslemSonucu {
  if (!input.idempotencyKey?.trim()) {
    return {
      ok: false,
      idempotencyKey: "",
      tekrarMi: false,
      hata: "Idempotency key zorunlu."
    };
  }

  const b = input.baslangic;
  const d = input.degisim;

  const sonraki: FinansBakiye = {
    stok: n(b.stok) + n(d.stok),
    kasa: n(b.kasa) + n(d.kasa),
    cari: n(b.cari) + n(d.cari),
    kdv: n(b.kdv) + n(d.kdv),
    maliyet: n(b.maliyet) + n(d.maliyet),
    brutKar: n(b.brutKar) + n(d.brutKar),
  };

  return {
    ok: true,
    idempotencyKey: input.idempotencyKey,
    tekrarMi: false,
    onceki: b,
    sonraki,
  };
}

/**
 * Gerçek transaction katmanı için sözleşme:
 * Aynı idempotencyKey ikinci kez işlendiğinde ilk sonucun tekrar döndürülmesi
 * ve finansal değişimin ikinci kez uygulanmaması gerekir.
 */
export function tekrarIslemEngelle(
  dahaOnceIslendi: boolean,
  key: string,
  onceki: FinansBakiye
): AtomikIslemSonucu {
  if (dahaOnceIslendi) {
    return {
      ok: true,
      idempotencyKey: key,
      tekrarMi: true,
      onceki,
      sonraki: onceki,
    };
  }
  return {
    ok: true,
    idempotencyKey: key,
    tekrarMi: false,
  };
}
