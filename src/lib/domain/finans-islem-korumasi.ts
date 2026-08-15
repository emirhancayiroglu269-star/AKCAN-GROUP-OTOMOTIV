import type { IslemGuvenlikBaglami } from "../security/islem-yetki-guard";
import { kritikIslemGuard, type KritikIslem } from "../security/kritik-islem-yetki";

export interface FinansIslemSonucu {
  allowed: boolean;
  islem: KritikIslem;
  reason?: string;
}

export function finansIslemYetkiKontrolu(
  ctx: IslemGuvenlikBaglami | null,
  islem: KritikIslem
): FinansIslemSonucu {
  const result = kritikIslemGuard(ctx, islem);
  return {
    allowed: result.allowed,
    islem,
    reason: result.reason,
  };
}
