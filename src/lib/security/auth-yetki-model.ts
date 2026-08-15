export type KullaniciRol =
  | "admin"
  | "yonetici"
  | "satis"
  | "depo"
  | "muhasebe"
  | "servis"
  | "salt-okuma";

export type Yetki =
  | "satis.gor"
  | "satis.olustur"
  | "satis.iptal"
  | "iade.olustur"
  | "alis.gor"
  | "alis.olustur"
  | "stok.gor"
  | "stok.duzenle"
  | "kasa.gor"
  | "kasa.islem"
  | "banka.gor"
  | "cari.gor"
  | "cari.islem"
  | "rapor.gor"
  | "ayarlar.gor"
  | "ayarlar.duzenle";

const ROL_YETKILERI: Record<KullaniciRol, readonly Yetki[]> = {
  admin: [
    "satis.gor","satis.olustur","satis.iptal","iade.olustur",
    "alis.gor","alis.olustur","stok.gor","stok.duzenle",
    "kasa.gor","kasa.islem","banka.gor","cari.gor","cari.islem",
    "rapor.gor","ayarlar.gor","ayarlar.duzenle"
  ],
  yonetici: [
    "satis.gor","satis.olustur","satis.iptal","iade.olustur",
    "alis.gor","alis.olustur","stok.gor","stok.duzenle",
    "kasa.gor","kasa.islem","banka.gor","cari.gor","cari.islem",
    "rapor.gor","ayarlar.gor"
  ],
  satis: ["satis.gor","satis.olustur","iade.olustur","stok.gor","cari.gor"],
  depo: ["stok.gor","stok.duzenle","alis.gor","alis.olustur"],
  muhasebe: ["satis.gor","alis.gor","kasa.gor","kasa.islem","banka.gor","cari.gor","cari.islem","rapor.gor"],
  servis: ["stok.gor","satis.gor"],
  "salt-okuma": ["satis.gor","alis.gor","stok.gor","kasa.gor","banka.gor","cari.gor","rapor.gor"],
};

export function yetkiliMi(rol: KullaniciRol, yetki: Yetki): boolean {
  return ROL_YETKILERI[rol]?.includes(yetki) ?? false;
}

export function rolDogrula(value: unknown): value is KullaniciRol {
  return typeof value === "string" && value in ROL_YETKILERI;
}
