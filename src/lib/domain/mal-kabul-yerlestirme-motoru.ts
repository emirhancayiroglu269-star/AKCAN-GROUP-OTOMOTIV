export type MalKabulDurumu =
  | "BEKLIYOR"
  | "KONTROLDE"
  | "KABUL_EDILDI"
  | "KISMEN_KABUL"
  | "REDDEDILDI"
  | "YERLESTIRILDI"
  | "IPTAL";

export interface MalKabulKalemi {
  urunId: string;
  siparisKalemId: string;
  siparisMiktari: number;
  gelenMiktar: number;
  kabulMiktari: number;
  redMiktari: number;
  depoId?: string;
  lokasyonId?: string;
  yerlesenMiktar: number;
}

export interface MalKabul {
  id: string;
  kabulNo: string;
  siparisId: string;
  tedarikciId: string;
  durum: MalKabulDurumu;
  kalemler: MalKabulKalemi[];
  idempotencyKey: string;
  tarih: string;
}

export function malKabulKalemiDogrula(k: MalKabulKalemi): void {
  if (!k.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!k.siparisKalemId?.trim()) throw new Error("Sipariş kalemi zorunlu.");
  if (k.siparisMiktari <= 0 || k.gelenMiktar < 0 || k.kabulMiktari < 0 || k.redMiktari < 0) {
    throw new Error("Mal kabul miktarları geçersiz.");
  }
  if (k.kabulMiktari + k.redMiktari > k.gelenMiktar) {
    throw new Error("Kabul + red miktarı gelen miktarı aşamaz.");
  }
  if (k.yerlesenMiktar < 0 || k.yerlesenMiktar > k.kabulMiktari) {
    throw new Error("Yerleşen miktar kabul miktarını aşamaz.");
  }
}

export function kalanYerlesim(
  kabulMiktari: number,
  yerlesenMiktar: number
): number {
  if (kabulMiktari < 0 || yerlesenMiktar < 0 || yerlesenMiktar > kabulMiktari) {
    throw new Error("Yerleşim miktarı geçersiz.");
  }
  return kabulMiktari - yerlesenMiktar;
}

export function malKabulDurumu(
  kabulMiktari: number,
  yerlesenMiktar: number,
  redMiktari = 0
): MalKabulDurumu {
  if (redMiktari > 0 && kabulMiktari === 0) return "REDDEDILDI";
  if (yerlesenMiktar === kabulMiktari && kabulMiktari > 0) return "YERLESTIRILDI";
  if (kabulMiktari > 0 && yerlesenMiktar < kabulMiktari) return "KISMEN_KABUL";
  return "KABUL_EDILDI";
}

export function lokasyonDagit(
  toplam: number,
  dagilim: Array<{ lokasyonId: string; miktar: number }>
): boolean {
  if (toplam < 0) throw new Error("Toplam miktar geçersiz.");
  const dagitilan = dagilim.reduce((s, x) => {
    if (!x.lokasyonId?.trim() || x.miktar < 0) throw new Error("Lokasyon dağılımı geçersiz.");
    return s + x.miktar;
  }, 0);

  return dagitilan === toplam;
}
