import type { KullaniciRol, Yetki } from "./auth-yetki-model";
import { yetkiliMi } from "./auth-yetki-model";

export interface IslemGuvenlikBaglami {
  authenticated: boolean;
  userId?: string;
  role: KullaniciRol;
  active: boolean;
}

export interface IslemGuardSonucu {
  allowed: boolean;
  reason?: string;
}

export function islemGuard(
  ctx: IslemGuvenlikBaglami | null,
  requiredPermission: Yetki
): IslemGuardSonucu {
  if (!ctx?.authenticated || !ctx.userId) {
    return { allowed: false, reason: "Oturum bulunamadı." };
  }

  if (!ctx.active) {
    return { allowed: false, reason: "Kullanıcı pasif." };
  }

  if (!yetkiliMi(ctx.role, requiredPermission)) {
    return { allowed: false, reason: "Bu işlem için yetkiniz yok." };
  }

  return { allowed: true };
}
