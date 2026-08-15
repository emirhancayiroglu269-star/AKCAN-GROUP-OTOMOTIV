export interface Cihaz {
  id: string;
  kullaniciId: string;
  cihazAdi?: string;
  cihazTipi: "WEB" | "MOBIL" | "MASAUSTU";
  sonGorulme: string;
  ip?: string;
  aktif: boolean;
}

export interface Oturum {
  userId: string;
  deviceId: string;
  expiresAt: string;
  revokedAt?: string;
}

export function oturumGecerliMi(o: Oturum, now = new Date()): boolean {
  if (o.revokedAt) return false;
  return new Date(o.expiresAt).getTime() > now.getTime();
}

export function cihazGorunurMu(c: Cihaz): boolean {
  return c.aktif;
}

export function cihazAdiVarsayilan(cihazTipi: Cihaz["cihazTipi"]): string {
  if (cihazTipi === "MOBIL") return "Mobil Cihaz";
  if (cihazTipi === "MASAUSTU") return "Masaüstü";
  return "Web Tarayıcı";
}
