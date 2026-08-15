export interface TedarikciPerformans {
  tedarikciId: string;
  fiyatPuani: number;
  teslimatPuani: number;
  kalitePuani: number;
  iadePuani: number;
  vadePuani: number;
  genelPuan: number;
}

export interface TedarikciSecimKriterleri {
  fiyatAgirlik: number;
  teslimatAgirlik: number;
  kaliteAgirlik: number;
  iadeAgirlik: number;
  vadeAgirlik: number;
}

export interface TedarikciAday {
  tedarikciId: string;
  birimFiyat: number;
  teslimatGun: number;
  kaliteOrani: number;
  iadeOrani: number;
  vadeGun: number;
}

export function agirliklariDogrula(k: TedarikciSecimKriterleri): void {
  const values = [
    k.fiyatAgirlik,
    k.teslimatAgirlik,
    k.kaliteAgirlik,
    k.iadeAgirlik,
    k.vadeAgirlik,
  ];

  if (values.some(v => v < 0)) {
    throw new Error("Ağırlıklar negatif olamaz.");
  }

  const toplam = values.reduce((s, v) => s + v, 0);
  if (Math.abs(toplam - 100) > 0.001) {
    throw new Error("Ağırlıkların toplamı %100 olmalı.");
  }
}

export function tedarikciSkoruHesapla(
  aday: TedarikciAday,
  referansFiyat: number,
  referansTeslimatGun: number,
  kriter: TedarikciSecimKriterleri
): number {
  agirliklariDogrula(kriter);

  if (referansFiyat <= 0 || referansTeslimatGun <= 0) {
    throw new Error("Referans değerleri geçersiz.");
  }

  const fiyatSkoru = Math.max(0, Math.min(100,
    (referansFiyat / aday.birimFiyat) * 100
  ));

  const teslimatSkoru = Math.max(0, Math.min(100,
    (referansTeslimatGun / Math.max(1, aday.teslimatGun)) * 100
  ));

  const kaliteSkoru = Math.max(0, Math.min(100, aday.kaliteOrani));
  const iadeSkoru = Math.max(0, Math.min(100, 100 - aday.iadeOrani));
  const vadeSkoru = Math.max(0, Math.min(100,
    (aday.vadeGun / Math.max(1, referansTeslimatGun)) * 100
  ));

  return (
    fiyatSkoru * kriter.fiyatAgirlik +
    teslimatSkoru * kriter.teslimatAgirlik +
    kaliteSkoru * kriter.kaliteAgirlik +
    iadeSkoru * kriter.iadeAgirlik +
    vadeSkoru * kriter.vadeAgirlik
  ) / 100;
}

export function enIyiTedarikciyiSec(
  adaylar: TedarikciAday[],
  referansFiyat: number,
  referansTeslimatGun: number,
  kriter: TedarikciSecimKriterleri
): { tedarikciId: string; puan: number } | null {
  if (!adaylar.length) return null;

  return adaylar
    .map(a => ({
      tedarikciId: a.tedarikciId,
      puan: tedarikciSkoruHesapla(a, referansFiyat, referansTeslimatGun, kriter),
    }))
    .sort((a, b) => b.puan - a.puan)[0];
}
