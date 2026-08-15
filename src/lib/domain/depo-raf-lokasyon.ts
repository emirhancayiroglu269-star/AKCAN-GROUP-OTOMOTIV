export interface Depo {
  id: string;
  kod: string;
  ad: string;
  adres?: string;
  aktif: boolean;
}

export interface RafLokasyonu {
  id: string;
  depoId: string;
  koridor?: string;
  bolum?: string;
  raf: string;
  goz?: string;
  etiket?: string;
  aktif: boolean;
}

export interface UrunLokasyonStogu {
  urunId: string;
  depoId: string;
  lokasyonId: string;
  miktar: number;
}

export function lokasyonKoduOlustur(
  depoKod: string,
  koridor: string | undefined,
  bolum: string | undefined,
  raf: string,
  goz: string | undefined
): string {
  return [depoKod, koridor, bolum, raf, goz]
    .filter(Boolean)
    .join("-");
}

export function lokasyonStoguDogrula(
  stok: UrunLokasyonStogu
): void {
  if (!stok.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!stok.depoId?.trim()) throw new Error("Depo zorunlu.");
  if (!stok.lokasyonId?.trim()) throw new Error("Lokasyon zorunlu.");
  if (!Number.isFinite(stok.miktar) || stok.miktar < 0) {
    throw new Error("Lokasyon stoğu negatif olamaz.");
  }
}

export function toplamLokasyonStogu(
  lokasyonlar: Array<Pick<UrunLokasyonStogu, "miktar">>
): number {
  return lokasyonlar.reduce((toplam, x) => toplam + x.miktar, 0);
}
