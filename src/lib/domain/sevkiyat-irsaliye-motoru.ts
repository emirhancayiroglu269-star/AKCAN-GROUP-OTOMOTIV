export type SevkiyatDurumu =
  | "HAZIRLANIYOR"
  | "KISMI_SEVK"
  | "SEVK_EDILDI"
  | "IPTAL";

export interface SevkiyatKalemi {
  urunId: string;
  siparisKalemId: string;
  rezervasyonId?: string;
  siparisMiktari: number;
  sevkMiktari: number;
  depoId: string;
  lokasyonId: string;
}

export interface Sevkiyat {
  id: string;
  irsaliyeNo: string;
  siparisId: string;
  musteriId: string;
  durum: SevkiyatDurumu;
  kalemler: SevkiyatKalemi[];
  idempotencyKey: string;
  tarih: string;
}

export function sevkiyatMiktariDogrula(k: SevkiyatKalemi): void {
  if (!k.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!k.siparisKalemId?.trim()) throw new Error("Sipariş kalemi zorunlu.");
  if (!k.depoId?.trim() || !k.lokasyonId?.trim()) {
    throw new Error("Depo ve lokasyon zorunlu.");
  }
  if (k.siparisMiktari <= 0 || k.sevkMiktari <= 0) {
    throw new Error("Miktarlar pozitif olmalı.");
  }
  if (k.sevkMiktari > k.siparisMiktari) {
    throw new Error("Sevk miktarı sipariş miktarını aşamaz.");
  }
}

export function sevkiyatDurumu(
  siparisMiktari: number,
  dahaOnceSevk: number,
  buSevk: number
): SevkiyatDurumu {
  if (siparisMiktari <= 0 || dahaOnceSevk < 0 || buSevk <= 0) {
    throw new Error("Sevkiyat miktarı geçersiz.");
  }

  const toplamSevk = dahaOnceSevk + buSevk;

  if (toplamSevk > siparisMiktari) {
    throw new Error("Toplam sevk siparişi aşamaz.");
  }

  return toplamSevk === siparisMiktari ? "SEVK_EDILDI" : "KISMI_SEVK";
}

export interface SevkStokEtki {
  stokCikisi: number;
  rezervasyonKullanimi: number;
}

export function sevkStokEtki(miktar: number): SevkStokEtki {
  if (miktar <= 0) throw new Error("Sevk miktarı pozitif olmalı.");
  return {
    stokCikisi: -miktar,
    rezervasyonKullanimi: miktar,
  };
}
