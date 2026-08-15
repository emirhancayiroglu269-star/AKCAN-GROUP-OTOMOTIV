export type EvrakTipi = "CEK" | "SENET";
export type EvrakDurumu =
  | "PORTFOYDE"
  | "BANKAYA_VERILDI"
  | "TAHSIL_EDILDI"
  | "KARSILIKSIZ"
  | "IADE_EDILDI"
  | "IPTAL";

export interface CekSenet {
  id: string;
  cariId: string;
  tip: EvrakTipi;
  numara: string;
  banka?: string;
  sube?: string;
  hesapNo?: string;
  tutar: number;
  vadeTarihi: string;
  durum: EvrakDurumu;
  belgeId?: string;
  idempotencyKey: string;
  tarih: string;
}

export interface PortfoyOzet {
  cekAdedi: number;
  senetAdedi: number;
  toplamPortfoy: number;
  bankadakiToplam: number;
  tahsilEdilen: number;
  karsiliksizToplam: number;
}

export function cekSenetDogrula(e: CekSenet): void {
  if (!e.cariId?.trim()) throw new Error("Cari zorunlu.");
  if (!e.numara?.trim()) throw new Error("Çek/senet numarası zorunlu.");
  if (e.tutar <= 0) throw new Error("Tutar pozitif olmalı.");
  if (!e.vadeTarihi || Number.isNaN(new Date(e.vadeTarihi).getTime())) {
    throw new Error("Vade tarihi geçersiz.");
  }
  if (!e.idempotencyKey?.trim()) throw new Error("Idempotency key zorunlu.");
}

export function evrakDurumuGecisiUygunMu(
  mevcut: EvrakDurumu,
  hedef: EvrakDurumu
): boolean {
  const gecisler: Record<EvrakDurumu, EvrakDurumu[]> = {
    PORTFOYDE: ["BANKAYA_VERILDI", "TAHSIL_EDILDI", "IADE_EDILDI", "IPTAL"],
    BANKAYA_VERILDI: ["TAHSIL_EDILDI", "KARSILIKSIZ", "IADE_EDILDI"],
    TAHSIL_EDILDI: [],
    KARSILIKSIZ: ["PORTFOYDE", "IADE_EDILDI"],
    IADE_EDILDI: [],
    IPTAL: [],
  };
  return gecisler[mevcut].includes(hedef);
}

export function portfoyOzetle(evraklar: CekSenet[]): PortfoyOzet {
  return {
    cekAdedi: evraklar.filter(e => e.tip === "CEK").length,
    senetAdedi: evraklar.filter(e => e.tip === "SENET").length,
    toplamPortfoy: evraklar
      .filter(e => e.durum === "PORTFOYDE")
      .reduce((s, e) => s + e.tutar, 0),
    bankadakiToplam: evraklar
      .filter(e => e.durum === "BANKAYA_VERILDI")
      .reduce((s, e) => s + e.tutar, 0),
    tahsilEdilen: evraklar
      .filter(e => e.durum === "TAHSIL_EDILDI")
      .reduce((s, e) => s + e.tutar, 0),
    karsiliksizToplam: evraklar
      .filter(e => e.durum === "KARSILIKSIZ")
      .reduce((s, e) => s + e.tutar, 0),
  };
}

export function vadesiGelenleriBul(
  evraklar: CekSenet[],
  bugun = new Date()
): CekSenet[] {
  return evraklar.filter(e =>
    ["PORTFOYDE", "BANKAYA_VERILDI"].includes(e.durum) &&
    new Date(e.vadeTarihi).getTime() <= bugun.getTime()
  );
}
