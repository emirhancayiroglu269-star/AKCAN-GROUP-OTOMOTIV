export type GirisSonucu =
  | { ok: true; userId: string; sessionToken: string; setupCompleted: true }
  | { ok: false; code: "INVALID_CREDENTIALS"|"ACCOUNT_DISABLED"|"SESSION_ERROR"|"SERVER_ERROR"; message: string };

export interface GirisIstegi {
  kullaniciAdi: string;
  sifre: string;
  cihazId: string;
  cihazTipi: "WEB"|"MOBIL"|"MASAUSTU";
  cihazAdi?: string;
}

export function girisIsteğiniDogrula(x: GirisIstegi) {
  if (!x.kullaniciAdi.trim()) throw new Error("Kullanıcı adı gerekli.");
  if (!x.sifre) throw new Error("Şifre gerekli.");
  if (!x.cihazId.trim()) throw new Error("Cihaz kimliği gerekli.");
}

export function basariliGirisYonlendirmesi(sonuc: GirisSonucu) {
  if (!sonuc.ok) return "/giris";
  return sonuc.setupCompleted ? "/dashboard" : "/ilk-kurulum";
}

export function merkeziKurulumKarari(setupCompleted: boolean) {
  return setupCompleted ? "LOGIN" : "SETUP";
}
