export type Para = number;
export type Kimlik = string;

export type OdemeYontemi =
  | "Nakit"
  | "Kredi Kartı"
  | "Banka"
  | "Havale"
  | "Açık Hesap"
  | "Çek"
  | "Senet"
  | string;

export interface SatisKalemi {
  id?: Kimlik;
  urunId?: Kimlik;
  stokKodu?: string;
  barkod?: string;
  miktar: number;
  birimFiyat: Para;
  iskonto?: Para;
  kdvOrani?: number;
  kdvTutari?: Para;
  netTutar?: Para;
  maliyet?: Para;
}

export interface SatisKaydi {
  id: Kimlik;
  belgeNo?: string;
  tarih: string;
  musteriId?: Kimlik | null;
  kalemler: SatisKalemi[];
  araToplam?: Para;
  iskonto?: Para;
  kdv?: Para;
  genelToplam: Para;
  durum?: "taslak" | "tamamlandi" | "iptal" | "iade" | string;
}

export interface OdemeHareketi {
  id?: Kimlik;
  satisId?: Kimlik;
  yontem: OdemeYontemi;
  tutar: Para;
  kasaId?: Kimlik | null;
  bankaId?: Kimlik | null;
  posId?: Kimlik | null;
  cariId?: Kimlik | null;
}

export interface StokHareketi {
  id?: Kimlik;
  urunId: Kimlik;
  tarih: string;
  tur: "alis" | "satis" | "iade" | "iptal" | "sayim" | "transfer" | "duzeltme" | string;
  miktar: number;
  birimMaliyet?: Para;
  referansId?: Kimlik | null;
}

export interface CariHareketi {
  id?: Kimlik;
  cariId: Kimlik;
  tarih: string;
  tur: "borc" | "alacak" | "tahsilat" | "odeme" | "iade" | "duzeltme" | string;
  tutar: Para;
  referansId?: Kimlik | null;
}

export interface KasaBankaHareketi {
  id?: Kimlik;
  hesapId: Kimlik;
  hesapTuru: "kasa" | "banka" | "pos" | string;
  tarih: string;
  tur: "tahsilat" | "odeme" | "iade" | "iptal" | "transfer" | "duzeltme" | string;
  tutar: Para;
  referansId?: Kimlik | null;
}

export interface IadeKaydi {
  id: Kimlik;
  satisId: Kimlik;
  tarih: string;
  kalemler: Array<{
    urunId: Kimlik;
    miktar: number;
    tutar: Para;
    maliyet?: Para;
  }>;
  toplam: Para;
}
