import type { StokHareketi, SatisKaydi, IadeKaydi } from "./erp-domain-models";

export interface StokBakiyesi {
  urunId: string;
  miktar: number;
}

export interface StokKontrolSonucu {
  ok: boolean;
  hata?: string;
}

export function satisStokKontrolu(
  satis: SatisKaydi,
  bakiyeler: Record<string, number>
): StokKontrolSonucu {
  for (const kalem of satis.kalemler) {
    if (!kalem.urunId) {
      return { ok: false, hata: "Satış kaleminde ürün ID eksik." };
    }
    if (!Number.isFinite(kalem.miktar) || kalem.miktar <= 0) {
      return { ok: false, hata: "Satış miktarı geçersiz." };
    }

    const mevcut = Number(bakiyeler[kalem.urunId] ?? 0);
    if (!Number.isFinite(mevcut) || mevcut < kalem.miktar) {
      return {
        ok: false,
        hata: `${kalem.stokKodu || kalem.urunId} için yeterli stok yok.`,
      };
    }
  }

  return { ok: true };
}

export function satisIcinStokHareketleri(
  satis: SatisKaydi
): StokHareketi[] {
  return satis.kalemler.map((kalem) => ({
    id: `${satis.id}:stok:${kalem.urunId}`,
    urunId: kalem.urunId!,
    tarih: satis.tarih,
    tur: "satis",
    miktar: -Math.abs(kalem.miktar),
    birimMaliyet: Number.isFinite(kalem.maliyet) ? kalem.maliyet : undefined,
    referansId: satis.id,
  }));
}

export function iadeIcinStokHareketleri(
  iade: IadeKaydi
): StokHareketi[] {
  return iade.kalemler.map((kalem) => ({
    id: `${iade.id}:stok:${kalem.urunId}`,
    urunId: kalem.urunId,
    tarih: iade.tarih,
    tur: "iade",
    miktar: Math.abs(kalem.miktar),
    birimMaliyet: Number.isFinite(kalem.maliyet) ? kalem.maliyet : undefined,
    referansId: iade.id,
  }));
}
