export type KaynakTipi = "SATIS" | "ALIS";

export interface KaynakKalem {
  parcaId: string;
  miktar: number;
  birimFiyat: number;
  maliyet: number;
  kdvOrani: number;
}

export interface TersIslem {
  id: string;
  idempotencyKey: string;
  kaynakIslemId: string;
  kaynakTipi: KaynakTipi;
  kalemler: KaynakKalem[];
  kismi?: boolean;
  tarih: string;
}

export interface TersIslemSonucu {
  ok: boolean;
  stokDegisimi: number;
  kasaDegisimi: number;
  cariDegisimi: number;
  kdvDegisimi: number;
  maliyetDegisimi: number;
  brutKarDegisimi: number;
  hata?: string;
}

function pozitif(v: number, alan: string) {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${alan} pozitif olmalı.`);
  return v;
}

export function tersIslemHesapla(input: TersIslem): TersIslemSonucu {
  if (!input.idempotencyKey?.trim()) {
    return { ok: false, stokDegisimi: 0, kasaDegisimi: 0, cariDegisimi: 0,
      kdvDegisimi: 0, maliyetDegisimi: 0, brutKarDegisimi: 0,
      hata: "Idempotency key zorunlu." };
  }

  if (!input.kaynakIslemId?.trim()) {
    return { ok: false, stokDegisimi: 0, kasaDegisimi: 0, cariDegisimi: 0,
      kdvDegisimi: 0, maliyetDegisimi: 0, brutKarDegisimi: 0,
      hata: "Kaynak işlem zorunlu." };
  }

  if (!input.kalemler.length) {
    return { ok: false, stokDegisimi: 0, kasaDegisimi: 0, cariDegisimi: 0,
      kdvDegisimi: 0, maliyetDegisimi: 0, brutKarDegisimi: 0,
      hata: "Ters işlem kalemi bulunamadı." };
  }

  let toplam = 0;
  let kdv = 0;
  let maliyet = 0;
  let adet = 0;

  for (const k of input.kalemler) {
    const miktar = pozitif(k.miktar, "Miktar");
    const fiyat = pozitif(k.birimFiyat, "Birim fiyat");
    const maliyetBirim = pozitif(k.maliyet, "Maliyet");
    const oran = Number.isFinite(k.kdvOrani) && k.kdvOrani >= 0 ? k.kdvOrani : 0;

    toplam += miktar * fiyat;
    kdv += miktar * fiyat * oran / 100;
    maliyet += miktar * maliyetBirim;
    adet += miktar;
  }

  // Satışın iadesi/iptali: stok geri gelir, tahsilat tersine döner, kâr geri alınır.
  // Alışın iadesi/iptali: stok çıkar, ödeme tersine döner, maliyet azalır.
  const satis = input.kaynakTipi === "SATIS";

  return {
    ok: true,
    stokDegisimi: satis ? adet : -adet,
    kasaDegisimi: satis ? -toplam : toplam,
    cariDegisimi: satis ? -toplam : toplam,
    kdvDegisimi: satis ? -kdv : -kdv,
    maliyetDegisimi: satis ? -maliyet : -maliyet,
    brutKarDegisimi: satis ? -(toplam - maliyet) : 0,
  };
}
