export type ABCSinifi = "A" | "B" | "C";
export type XYZSinifi = "X" | "Y" | "Z";
export type StokHizSinifi = "HIZLI" | "NORMAL" | "YAVAS" | "OLU_STOK";

export interface StokAnalizGirdisi {
  urunId: string;
  aylikCiro: number;
  aylikAdet: number;
  ortalamaStok: number;
  sonSatisTarihi?: string;
  bugun?: string;
}

export interface StokAnalizSonucu {
  urunId: string;
  abc: ABCSinifi;
  xyz: XYZSinifi;
  hiz: StokHizSinifi;
  stokDevir: number;
  gunlukOrtalamaSatis: number;
  aksiyon: string;
}

export function abcSinifiBelirle(
  yuzdeKumulatifCiro: number
): ABCSinifi {
  if (yuzdeKumulatifCiro <= 80) return "A";
  if (yuzdeKumulatifCiro <= 95) return "B";
  return "C";
}

export function xyzSinifiBelirle(
  varyasyonKatsayisi: number
): XYZSinifi {
  if (varyasyonKatsayisi <= 0.5) return "X";
  if (varyasyonKatsayisi <= 1) return "Y";
  return "Z";
}

export function stokHiziniBelirle(
  gunlukSatis: number,
  sonSatisGunSayisi: number
): StokHizSinifi {
  if (gunlukSatis <= 0 && sonSatisGunSayisi >= 180) return "OLU_STOK";
  if (gunlukSatis >= 1 || sonSatisGunSayisi <= 30) return "HIZLI";
  if (sonSatisGunSayisi <= 90) return "NORMAL";
  return "YAVAS";
}

export function stokDevirHesapla(
  yillikSatisAdedi: number,
  ortalamaStok: number
): number {
  if (yillikSatisAdedi < 0 || ortalamaStok < 0) {
    throw new Error("Stok devir girdileri negatif olamaz.");
  }
  return ortalamaStok === 0 ? 0 : yillikSatisAdedi / ortalamaStok;
}

export function stokAksiyonunuBelirle(
  abc: ABCSinifi,
  xyz: XYZSinifi,
  hiz: StokHizSinifi
): string {
  if (hiz === "OLU_STOK") return "SATIN ALMA DURDUR / İADE VEYA KAMPANYA DEĞERLENDİR";
  if (abc === "A" && xyz === "X") return "YÜKSEK ÖNCELİKLE STOKTA TUT";
  if (abc === "A") return "YAKINDAN İZLE / GÜVENLİK STOKU KORU";
  if (abc === "B" && hiz === "HIZLI") return "NORMAL STOKLAMA";
  if (abc === "C" && hiz === "YAVAS") return "DÜŞÜK STOK / SİPARİŞE GÖRE AL";
  return "PERİYODİK KONTROL";
}
