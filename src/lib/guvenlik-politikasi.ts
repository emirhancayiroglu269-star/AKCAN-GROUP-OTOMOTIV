export type GuvenlikIslemi =
  | "satis_indirim"
  | "fiyat_alt_limit"
  | "stok_duzeltme"
  | "stok_sayim"
  | "finans_ters_islem"
  | "tahsilat_iptal"
  | "odeme_iptal"
  | "kasa_duzeltme"
  | "banka_duzeltme"
  | "kullanici_yetki"
  | "donem_kapatma";

export interface YetkiBaglami {
  kullaniciId?: string | null;
  roller?: string[];
  yetkiler?: string[];
  yoneticiOnayi?: boolean;
}

const ROL_YETKILERI: Record<string, GuvenlikIslemi[]> = {
  yonetici: [
    "satis_indirim",
    "fiyat_alt_limit",
    "stok_duzeltme",
    "stok_sayim",
    "finans_ters_islem",
    "tahsilat_iptal",
    "odeme_iptal",
    "kasa_duzeltme",
    "banka_duzeltme",
    "kullanici_yetki",
    "donem_kapatma",
  ],
  mudur: [
    "satis_indirim",
    "fiyat_alt_limit",
    "stok_duzeltme",
    "stok_sayim",
    "finans_ters_islem",
    "tahsilat_iptal",
    "odeme_iptal",
    "kasa_duzeltme",
    "banka_duzeltme",
  ],
};

export function yetkiliMi(islem: GuvenlikIslemi, baglam: YetkiBaglami): boolean {
  if (!baglam.kullaniciId) return false;

  if (baglam.yetkiler?.includes(islem)) return true;

  return (baglam.roller || []).some((rol) =>
    ROL_YETKILERI[rol.toLowerCase()]?.includes(islem)
  );
}

export function yoneticiOnayiGerekliMi(islem: GuvenlikIslemi): boolean {
  return [
    "fiyat_alt_limit",
    "finans_ters_islem",
    "tahsilat_iptal",
    "odeme_iptal",
    "kasa_duzeltme",
    "banka_duzeltme",
    "kullanici_yetki",
    "donem_kapatma",
  ].includes(islem);
}

/**
 * Bu kontrol yalnızca istemci tarafındaki UX/işlem kapısıdır.
 * Gerçek güvenlik Supabase RLS / Edge Function / server-side authorization
 * üzerinde tekrar uygulanmalıdır. localStorage veya UI kontrolü tek başına
 * yetki kanıtı olarak kullanılmamalıdır.
 */
export function guvenliIslemIzni(
  islem: GuvenlikIslemi,
  baglam: YetkiBaglami
): { ok: boolean; yoneticiOnayi: boolean; mesaj?: string } {
  if (!yetkiliMi(islem, baglam)) {
    return { ok: false, yoneticiOnayi: false, mesaj: "Bu işlem için yetkiniz yok." };
  }

  const onay = yoneticiOnayiGerekliMi(islem);
  if (onay && !baglam.yoneticiOnayi) {
    return {
      ok: false,
      yoneticiOnayi: true,
      mesaj: "Bu işlem için yönetici onayı gerekiyor.",
    };
  }

  return { ok: true, yoneticiOnayi: onay };
}
