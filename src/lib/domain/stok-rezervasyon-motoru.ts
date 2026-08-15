export type RezervasyonDurumu =
  | "AKTIF"
  | "KISMEN_KULLANILDI"
  | "TAMAMLANDI"
  | "IPTAL";

export interface StokRezervasyonu {
  id: string;
  siparisId: string;
  urunId: string;
  depoId: string;
  lokasyonId?: string;
  miktar: number;
  kullanilanMiktar: number;
  durum: RezervasyonDurumu;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export function rezervasyonKalan(
  miktar: number,
  kullanilanMiktar: number
): number {
  if (miktar < 0 || kullanilanMiktar < 0 || kullanilanMiktar > miktar) {
    throw new Error("Rezervasyon miktarı geçersiz.");
  }
  return miktar - kullanilanMiktar;
}

export function rezervasyonDurumuBelirle(
  miktar: number,
  kullanilanMiktar: number,
  iptal = false
): RezervasyonDurumu {
  if (iptal) return "IPTAL";
  const kalan = rezervasyonKalan(miktar, kullanilanMiktar);
  if (kalan === 0) return "TAMAMLANDI";
  if (kullanilanMiktar > 0) return "KISMEN_KULLANILDI";
  return "AKTIF";
}

export function rezervasyonUygunMu(
  mevcutStok: number,
  ayrilmisStok: number,
  talep: number
): boolean {
  if (mevcutStok < 0 || ayrilmisStok < 0 || talep <= 0) return false;
  return mevcutStok - ayrilmisStok >= talep;
}

export function kullanilabilirStok(
  mevcutStok: number,
  ayrilmisStok: number
): number {
  if (mevcutStok < 0 || ayrilmisStok < 0) {
    throw new Error("Stok değerleri negatif olamaz.");
  }
  return Math.max(0, mevcutStok - ayrilmisStok);
}
