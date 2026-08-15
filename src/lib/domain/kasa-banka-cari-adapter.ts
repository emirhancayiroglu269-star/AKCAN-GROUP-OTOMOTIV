import type {
  OdemeHareketi,
  CariHareketi,
  KasaBankaHareketi,
  SatisKaydi,
} from "./erp-domain-models";

export interface ParaHareketKontrolu {
  ok: boolean;
  hata?: string;
}

export function odemeHareketleriKontrolu(
  satis: SatisKaydi,
  odemeler: OdemeHareketi[]
): ParaHareketKontrolu {
  const toplam = odemeler.reduce(
    (t, o) => t + (Number.isFinite(o.tutar) ? o.tutar : 0),
    0
  );

  if (Math.abs(toplam - satis.genelToplam) > 0.01) {
    return { ok: false, hata: "Ödeme toplamı satış toplamıyla eşleşmiyor." };
  }

  if (odemeler.some((o) => !o.yontem || !Number.isFinite(o.tutar) || o.tutar <= 0)) {
    return { ok: false, hata: "Geçersiz ödeme hareketi." };
  }

  return { ok: true };
}

export function odemedenHesapHareketleri(
  satis: SatisKaydi,
  odemeler: OdemeHareketi[]
): KasaBankaHareketi[] {
  return odemeler.map((o) => ({
    id: `${satis.id}:hesap:${o.id || o.yontem}`,
    hesapId: o.kasaId || o.bankaId || o.posId || "",
    hesapTuru: o.posId ? "pos" : o.bankaId ? "banka" : "kasa",
    tarih: satis.tarih,
    tur: "tahsilat",
    tutar: Math.abs(o.tutar),
    referansId: satis.id,
  }));
}

export function acikHesapCariHareketi(
  satis: SatisKaydi,
  odeme: OdemeHareketi
): CariHareketi | null {
  if (odeme.yontem !== "Açık Hesap" || !odeme.cariId) return null;

  return {
    id: `${satis.id}:cari:${odeme.cariId}`,
    cariId: odeme.cariId,
    tarih: satis.tarih,
    tur: "borc",
    tutar: Math.abs(odeme.tutar),
    referansId: satis.id,
  };
}

export function iadeHesapHareketi(
  satisId: string,
  tarih: string,
  hesapId: string,
  hesapTuru: "kasa" | "banka" | "pos",
  tutar: number
): KasaBankaHareketi {
  return {
    id: `${satisId}:iade:${hesapId}`,
    hesapId,
    hesapTuru,
    tarih,
    tur: "iade",
    tutar: -Math.abs(tutar),
    referansId: satisId,
  };
}
