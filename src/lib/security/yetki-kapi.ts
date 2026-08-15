import type { KullaniciRol, Yetki } from "./auth-yetki-model";

export interface YetkiliKullanici {
  id: string;
  rol: KullaniciRol;
}

export function islemYetkiliMi(
  kullanici: YetkiliKullanici | null,
  yetki: Yetki
): boolean {
  if (!kullanici?.id) return false;

  // Gerçek yetki kaynağı server/RLS olmalıdır.
  // Bu fonksiyon UI ve servis katmanında erken kontrol içindir.
  const { yetkiliMi } = require("./auth-yetki-model") as typeof import("./auth-yetki-model");
  return yetkiliMi(kullanici.rol, yetki);
}

export function guvenliIslemKontrolu(
  kullanici: YetkiliKullanici | null,
  yetki: Yetki
): { ok: boolean; hata?: string } {
  if (!kullanici) return { ok: false, hata: "Oturum bulunamadı." };
  if (!islemYetkiliMi(kullanici, yetki)) {
    return { ok: false, hata: "Bu işlem için yetkiniz yok." };
  }
  return { ok: true };
}
