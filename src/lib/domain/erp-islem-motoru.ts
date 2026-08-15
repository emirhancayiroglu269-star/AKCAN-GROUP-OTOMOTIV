export type ErpIslemTipi =
  | "SATIS"
  | "ALIS"
  | "SATIS_IADE"
  | "SATIS_IPTAL"
  | "ALIS_IADE"
  | "ALIS_IPTAL";

export interface ErpIslemKalemi {
  parcaId: string;
  miktar: number;
  birimFiyat: number;
  maliyet: number;
  kdvOrani: number;
}

export interface ErpIslem {
  id: string;
  tip: ErpIslemTipi;
  idempotencyKey: string;
  kaynakIslemId?: string;
  kalemler: ErpIslemKalemi[];
  toplam: number;
  kdv: number;
  odemeYontemi?: "NAKIT" | "POS" | "HAVALE" | "ACIK_HESAP";
  cariId?: string;
}

export interface ErpIslemEtki {
  stok: number;
  kasa: number;
  banka: number;
  pos: number;
  cari: number;
  kdv: number;
  maliyet: number;
  brutKar: number;
}

export function erpIslemEtki(islem: ErpIslem): ErpIslemEtki {
  if (!islem.idempotencyKey?.trim()) throw new Error("Idempotency key zorunlu.");
  if (!islem.kalemler.length) throw new Error("İşlem kalemi bulunamadı.");

  const satis = islem.tip === "SATIS";
  const satisTersi = islem.tip === "SATIS_IADE" || islem.tip === "SATIS_IPTAL";
  const alis = islem.tip === "ALIS";
  const alisTersi = islem.tip === "ALIS_IADE" || islem.tip === "ALIS_IPTAL";

  let adet = 0;
  let maliyet = 0;
  for (const k of islem.kalemler) {
    if (k.miktar <= 0 || k.birimFiyat <= 0 || k.maliyet <= 0) {
      throw new Error("Miktar/fiyat/maliyet pozitif olmalı.");
    }
    adet += k.miktar;
    maliyet += k.miktar * k.maliyet;
  }

  const toplam = islem.toplam;
  const kar = toplam - maliyet;
  const stok =
    satis || alisTersi ? -adet :
    alis || satisTersi ? adet : 0;

  const finansSign =
    satis ? 1 :
    alis ? -1 :
    satisTersi ? -1 :
    alisTersi ? 1 : 0;

  const kasa = islem.odemeYontemi === "NAKIT" ? finansSign * toplam : 0;
  const banka = islem.odemeYontemi === "HAVALE" ? finansSign * toplam : 0;
  const pos = islem.odemeYontemi === "POS" ? finansSign * toplam : 0;

  const cari =
    islem.odemeYontemi === "ACIK_HESAP"
      ? finansSign * toplam
      : 0;

  return {
    stok,
    kasa,
    banka,
    pos,
    cari,
    kdv: (satisTersi || alisTersi) ? -islem.kdv : islem.kdv,
    maliyet: (satisTersi || alisTersi) ? -maliyet : maliyet,
    brutKar: satis ? kar : satisTersi ? -kar : 0,
  };
}
