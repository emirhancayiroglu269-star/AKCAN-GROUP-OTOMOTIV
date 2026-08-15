export type Rol =
  | "SUPER_ADMIN"
  | "YONETICI"
  | "SATIS"
  | "SATIN_ALMA"
  | "DEPO"
  | "KASA"
  | "MUHASEBE"
  | "RAPOR"
  | "SADE_KULLANICI";

export type Izin =
  | "URUN_GOR"
  | "URUN_DUZENLE"
  | "FIYAT_DEGISTIR"
  | "SATIS_OLUSTUR"
  | "SATIS_IPTAL"
  | "ALIS_OLUSTUR"
  | "ALIS_ONAYLA"
  | "STOK_DUZELT"
  | "CARI_GOR"
  | "CARI_LIMIT_DEGISTIR"
  | "TAHSILAT_GIR"
  | "KASA_ISLEM"
  | "BANKA_ISLEM"
  | "RAPOR_GOR"
  | "KULLANICI_YONET"
  | "YETKI_YONET"
  | "FINANS_ONAY";

export interface Kullanici {
  id: string;
  adSoyad: string;
  rol: Rol;
  aktif: boolean;
}

export interface OnayTalebi {
  id: string;
  kullaniciId: string;
  islem: string;
  tutar?: number;
  gerekce: string;
  durum: "BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI";
  tarih: string;
}

const ROL_IZINLERI: Record<Rol, Izin[]> = {
  SUPER_ADMIN: [
    "URUN_GOR","URUN_DUZENLE","FIYAT_DEGISTIR","SATIS_OLUSTUR","SATIS_IPTAL",
    "ALIS_OLUSTUR","ALIS_ONAYLA","STOK_DUZELT","CARI_GOR","CARI_LIMIT_DEGISTIR",
    "TAHSILAT_GIR","KASA_ISLEM","BANKA_ISLEM","RAPOR_GOR","KULLANICI_YONET",
    "YETKI_YONET","FINANS_ONAY"
  ],
  YONETICI: [
    "URUN_GOR","URUN_DUZENLE","FIYAT_DEGISTIR","SATIS_OLUSTUR","SATIS_IPTAL",
    "ALIS_OLUSTUR","ALIS_ONAYLA","STOK_DUZELT","CARI_GOR","CARI_LIMIT_DEGISTIR",
    "TAHSILAT_GIR","KASA_ISLEM","BANKA_ISLEM","RAPOR_GOR","FINANS_ONAY"
  ],
  SATIS: ["URUN_GOR","SATIS_OLUSTUR","CARI_GOR","TAHSILAT_GIR","RAPOR_GOR"],
  SATIN_ALMA: ["URUN_GOR","ALIS_OLUSTUR","CARI_GOR","RAPOR_GOR"],
  DEPO: ["URUN_GOR","STOK_DUZELT","RAPOR_GOR"],
  KASA: ["URUN_GOR","TAHSILAT_GIR","KASA_ISLEM","RAPOR_GOR"],
  MUHASEBE: ["CARI_GOR","TAHSILAT_GIR","BANKA_ISLEM","RAPOR_GOR","FINANS_ONAY"],
  RAPOR: ["RAPOR_GOR"],
  SADE_KULLANICI: ["URUN_GOR","RAPOR_GOR"],
};

export function yetkiVarMi(kullanici: Kullanici, izin: Izin): boolean {
  if (!kullanici.aktif) return false;
  return ROL_IZINLERI[kullanici.rol].includes(izin);
}

export function onayGerekliMi(
  islem: string,
  tutar: number,
  esikTutar: number
): boolean {
  if (tutar < 0 || esikTutar < 0) {
    throw new Error("Tutarlar negatif olamaz.");
  }
  const kritikIslemler = [
    "FIYAT_OVERRIDE",
    "ALIS_YUKSEK_TUTAR",
    "SATIS_IADE_YUKSEK",
    "CARI_LIMIT_OVERRIDE",
    "KASA_DUZELTME",
    "BANKA_DUZELTME",
  ];
  return kritikIslemler.includes(islem) && tutar >= esikTutar;
}

export function onayTalebiDogrula(t: OnayTalebi): void {
  if (!t.kullaniciId?.trim()) throw new Error("Kullanıcı zorunlu.");
  if (!t.islem?.trim()) throw new Error("İşlem zorunlu.");
  if (!t.gerekce?.trim()) throw new Error("Gerekçe zorunlu.");
  if (t.tutar !== undefined && t.tutar < 0) {
    throw new Error("Tutar negatif olamaz.");
  }
}

export function rolIzinleriniGetir(rol: Rol): Izin[] {
  return [...ROL_IZINLERI[rol]];
}
