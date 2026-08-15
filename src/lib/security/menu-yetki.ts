import type { KullaniciRol, Yetki } from "./auth-yetki-model";

export interface MenuItem {
  id: string;
  label: string;
  yetki: Yetki;
}

export const ERP_MENU: readonly MenuItem[] = [
  { id: "dashboard", label: "Ana Sayfa", yetki: "rapor.gor" },
  { id: "satis", label: "Satış", yetki: "satis.gor" },
  { id: "alis", label: "Mal Alış", yetki: "alis.gor" },
  { id: "stok", label: "Stok", yetki: "stok.gor" },
  { id: "kasa", label: "Kasa", yetki: "kasa.gor" },
  { id: "banka", label: "Banka", yetki: "banka.gor" },
  { id: "cari", label: "Cari", yetki: "cari.gor" },
  { id: "rapor", label: "Raporlar", yetki: "rapor.gor" },
  { id: "ayarlar", label: "Ayarlar", yetki: "ayarlar.gor" },
];

export function gorunenMenuler(
  rol: KullaniciRol,
  yetkiliMi: (rol: KullaniciRol, yetki: Yetki) => boolean
): MenuItem[] {
  return ERP_MENU.filter((menu) => yetkiliMi(rol, menu.yetki));
}
