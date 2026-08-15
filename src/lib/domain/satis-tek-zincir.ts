export interface SatisKalemi {
  parcaId: string;
  miktar: number;
  birimFiyat: number;
  maliyet: number;
  kdvOrani: number;
}

export type OdemeYontemi = "NAKIT" | "POS" | "HAVALE" | "ACIK_HESAP";

export interface SatisIslemi {
  id: string;
  idempotencyKey: string;
  musteriId?: string;
  hesapId?: string;
  odemeYontemi: OdemeYontemi;
  kalemler: SatisKalemi[];
  tarih: string;
}

export interface SatisZincirSonucu {
  ok: boolean;
  toplam: number;
  kdv: number;
  maliyet: number;
  brutKar: number;
  stokDegisimi: number;
  kasaDegisimi: number;
  cariDegisimi: number;
  hata?: string;
}

function pozitif(v: number, alan: string) {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${alan} pozitif olmalı.`);
  return v;
}

export function satisTekZincir(islem: SatisIslemi): SatisZincirSonucu {
  if (!islem.idempotencyKey?.trim()) {
    return { ok: false, toplam: 0, kdv: 0, maliyet: 0, brutKar: 0,
      stokDegisimi: 0, kasaDegisimi: 0, cariDegisimi: 0,
      hata: "Idempotency key zorunlu." };
  }

  if (!islem.kalemler.length) {
    return { ok: false, toplam: 0, kdv: 0, maliyet: 0, brutKar: 0,
      stokDegisimi: 0, kasaDegisimi: 0, cariDegisimi: 0,
      hata: "Satış kalemi bulunamadı." };
  }

  let toplam = 0;
  let kdv = 0;
  let maliyet = 0;
  let adet = 0;

  for (const k of islem.kalemler) {
    const miktar = pozitif(k.miktar, "Miktar");
    const fiyat = pozitif(k.birimFiyat, "Birim fiyat");
    const maliyetBirim = pozitif(k.maliyet, "Maliyet");
    const kdvOrani = Number.isFinite(k.kdvOrani) && k.kdvOrani >= 0 ? k.kdvOrani : 0;

    const satir = miktar * fiyat;
    toplam += satir;
    kdv += satir * kdvOrani / 100;
    maliyet += miktar * maliyetBirim;
    adet += miktar;
  }

  const brutKar = toplam - maliyet;
  const nakit = islem.odemeYontemi !== "ACIK_HESAP";
  const kasaDegisimi = nakit ? toplam : 0;
  const cariDegisimi = nakit ? 0 : toplam;

  return {
    ok: true,
    toplam,
    kdv,
    maliyet,
    brutKar,
    stokDegisimi: -adet,
    kasaDegisimi,
    cariDegisimi,
  };
}
