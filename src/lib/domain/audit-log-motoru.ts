export type AuditIslem =
  | "OLUSTURMA" | "GUNCELLEME" | "SILME" | "ONAY" | "RED" | "IPTAL"
  | "TAHSILAT" | "ODEME" | "TRANSFER" | "FIYAT_DEGISIKLIGI"
  | "STOK_DUZELTME" | "LOGIN" | "LOGOUT";

export type AuditSonuc = "BASARILI" | "BASARISIZ";

export interface AuditLog {
  id: string;
  kullaniciId: string;
  kullaniciAdi?: string;
  rol?: string;
  islem: AuditIslem;
  modul: string;
  kaynakTipi?: string;
  kaynakId?: string;
  aciklama: string;
  sonuc: AuditSonuc;
  tarih: string;
  ip?: string;
  sessionId?: string;
  correlationId?: string;
  oncekiDeger?: unknown;
  yeniDeger?: unknown;
}

export function auditLogDogrula(log: AuditLog): void {
  if (!log.kullaniciId?.trim()) throw new Error("Kullanıcı zorunlu.");
  if (!log.islem) throw new Error("İşlem zorunlu.");
  if (!log.modul?.trim()) throw new Error("Modül zorunlu.");
  if (!log.aciklama?.trim()) throw new Error("Açıklama zorunlu.");
  if (!log.tarih || Number.isNaN(new Date(log.tarih).getTime()))
    throw new Error("Audit tarihi geçersiz.");
}

export function hassasDegerTemizle(deger: unknown): unknown {
  if (!deger || typeof deger !== "object") return deger;
  const hassas = new Set([
    "password","sifre","token","accessToken","refreshToken",
    "secret","apiKey","cardNumber","cvv"
  ]);
  if (Array.isArray(deger)) return deger.map(hassasDegerTemizle);
  const sonuc: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(deger as Record<string, unknown>)) {
    sonuc[key] = hassas.has(key) ? "[REDACTED]" : hassasDegerTemizle(value);
  }
  return sonuc;
}

export function auditDegisiklikOlustur(oncekiDeger: unknown, yeniDeger: unknown) {
  return {
    oncekiDeger: hassasDegerTemizle(oncekiDeger),
    yeniDeger: hassasDegerTemizle(yeniDeger),
  };
}
