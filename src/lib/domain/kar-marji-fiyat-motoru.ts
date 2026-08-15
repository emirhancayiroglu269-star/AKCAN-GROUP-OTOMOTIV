export interface FiyatMaliyeti {
  birimMaliyet: number;
  sabitGiderPayi: number;
  komisyonOrani: number;
  kdvOrani: number;
}

export interface MinimumSatisSonucu {
  maliyetBaz: number;
  minimumNetSatis: number;
  minimumEtiketFiyati: number;
  hedefBrutMarj: number;
}

export function minimumNetSatisHesapla(
  birimMaliyet: number,
  sabitGiderPayi: number,
  hedefBrutMarj: number
): number {
  if (birimMaliyet < 0 || sabitGiderPayi < 0) {
    throw new Error("Maliyet değerleri negatif olamaz.");
  }
  if (hedefBrutMarj < 0 || hedefBrutMarj >= 100) {
    throw new Error("Hedef brüt marj %0-99.99 arasında olmalı.");
  }

  const baz = birimMaliyet + sabitGiderPayi;
  return baz / (1 - hedefBrutMarj / 100);
}

export function minimumEtiketFiyatiHesapla(
  netSatis: number,
  komisyonOrani: number,
  kdvOrani: number
): number {
  if (netSatis < 0) throw new Error("Net satış negatif olamaz.");
  if (komisyonOrani < 0 || komisyonOrani >= 100) {
    throw new Error("Komisyon oranı geçersiz.");
  }
  if (kdvOrani < 0) throw new Error("KDV oranı geçersiz.");

  const komisyonCarpani = 1 - komisyonOrani / 100;
  const kdvCarpani = 1 + kdvOrani / 100;

  return netSatis * kdvCarpani / komisyonCarpani;
}

export function brutKarHesapla(
  netSatis: number,
  maliyet: number
): number {
  if (netSatis < 0 || maliyet < 0) {
    throw new Error("Kâr hesabı negatif değer kabul etmez.");
  }
  return netSatis - maliyet;
}

export function brutMarjHesapla(
  netSatis: number,
  maliyet: number
): number {
  if (netSatis <= 0 || maliyet < 0) {
    throw new Error("Net satış/maliyet geçersiz.");
  }
  return ((netSatis - maliyet) / netSatis) * 100;
}

export function hedefMarjaGoreFiyat(
  toplamMaliyet: number,
  hedefMarj: number
): number {
  if (toplamMaliyet < 0 || hedefMarj < 0 || hedefMarj >= 100) {
    throw new Error("Hedef marj veya maliyet geçersiz.");
  }
  return toplamMaliyet / (1 - hedefMarj / 100);
}
