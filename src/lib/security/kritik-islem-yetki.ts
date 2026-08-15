import type { Yetki, KullaniciRol } from "./auth-yetki-model";
import { islemGuard, type IslemGuvenlikBaglami } from "./islem-yetki-guard";

export type KritikIslem =
  | "satis.olustur"
  | "satis.iptal"
  | "iade.olustur"
  | "alis.olustur"
  | "stok.duzenle"
  | "kasa.islem"
  | "cari.islem";

const YETKI_MAP: Record<KritikIslem, Yetki> = {
  "satis.olustur": "satis.olustur",
  "satis.iptal": "satis.iptal",
  "iade.olustur": "iade.olustur",
  "alis.olustur": "alis.olustur",
  "stok.duzenle": "stok.duzenle",
  "kasa.islem": "kasa.islem",
  "cari.islem": "cari.islem",
};

export function kritikIslemGuard(
  ctx: IslemGuvenlikBaglami | null,
  islem: KritikIslem
) {
  return islemGuard(ctx, YETKI_MAP[islem]);
}
