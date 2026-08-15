export interface AlisKalemi {
  parcaId: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
}

export type AlisOdemeYontemi = "NAKIT" | "HAVALE" | "ACIK_HESAP";

export interface AlisIslemi {
  id: string;
  idempotencyKey: string;
  tedarikciId?: string;
  hesapId?: string;
  odemeYontemi: AlisOdemeYontemi;
  kalemler: AlisKalemi[];
  tarih: string;
}

export interface AlisZincirSonucu {
  ok: boolean;
  toplam: number;
  kdv: number;
  stokDegisimi: number;
  tedarikciCariDegisimi: number;
  kasaDegisimi: number;
  maliyetArtisi: number;
  hata?: string;
}

function pozitif(v: number, alan: string) {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${alan} pozitif olmalı.`);
  return v;
}

export function alisTekZincir(islem: AlisIslemi): AlisZincirSonucu {
  if (!islem.idempotencyKey?.trim()) {
    return {
      ok: false, toplam: 0, kdv: 0, stokDegisimi: 0,
      tedarikciCariDegisimi: 0, kasaDegisimi: 0, maliyetArtisi: 0,
      hata: "Idempotency key zorunlu."
    };
  }

  if (!islem.kalemler.length) {
    return {
      ok: false, toplam: 0, kdv: 0, stokDegisimi: 0,
      tedarikciCariDegisimi: 0, kasaDegisimi: 0, maliyetArtisi: 0,
      hata: "Alış kalemi bulunamadı."
    };
  }

  let toplam = 0;
  let kdv = 0;
  let adet = 0;

  for (const k of islem.kalemler) {
    const miktar = pozitif(k.miktar, "Miktar");
    const fiyat = pozitif(k.birimFiyat, "Birim fiyat");
    const oran = Number.isFinite(k.kdvOrani) && k.kdvOrani >= 0 ? k.kdvOrani : 0;

    toplam += miktar * fiyat;
    kdv += miktar * fiyat * oran / 100;
    adet += miktar;
  }

  const nakit = islem.odemeYontemi !== "ACIK_HESAP";

  return {
    ok: true,
    toplam,
    kdv,
    stokDegisimi: adet,
    tedarikciCariDegisimi: nakit ? 0 : toplam,
    kasaDegisimi: nakit ? -toplam : 0,
    maliyetArtisi: toplam,
  };
}
