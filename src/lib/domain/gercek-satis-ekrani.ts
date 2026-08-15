export type OdemeTipi = "NAKIT" | "KART" | "HAVALE" | "ACIK_HESAP";

export interface SatisSatiri {
  urunId: string;
  stokKodu: string;
  urunAdi: string;
  barkod?: string;
  miktar: number;
  birimFiyat: number;
  iskonto: number;
  kdvOrani: number;
  maliyet: number;
}

export interface SatisTaslagi {
  musteriId?: string;
  satirlar: SatisSatiri[];
  odemeTipi?: OdemeTipi;
}

export interface SatisSonucu {
  araToplam: number;
  kdv: number;
  genelToplam: number;
  toplamMaliyet: number;
  brutKar: number;
}

export function satirNet(s: SatisSatiri): number {
  const brut = s.miktar * s.birimFiyat;
  return brut - Math.max(0, Math.min(brut, s.iskonto));
}

export function satisHesapla(s: SatisTaslagi): SatisSonucu {
  if (!s.satirlar.length) throw new Error("Sepet boş.");
  if (s.satirlar.some(x => x.miktar <= 0)) throw new Error("Miktar sıfırdan büyük olmalı.");
  if (s.satirlar.some(x => x.birimFiyat < 0)) throw new Error("Birim fiyat negatif olamaz.");

  const araToplam = s.satirlar.reduce((t, x) => t + satirNet(x), 0);
  const kdv = s.satirlar.reduce((t, x) => t + satirNet(x) * x.kdvOrani / 100, 0);
  const genelToplam = araToplam + kdv;
  const toplamMaliyet = s.satirlar.reduce((t, x) => t + x.miktar * x.maliyet, 0);

  return {
    araToplam,
    kdv,
    genelToplam,
    toplamMaliyet,
    brutKar: araToplam - toplamMaliyet
  };
}

export function satisTamamlamaKontrolu(s: SatisTaslagi): void {
  satisHesapla(s);
  if (!s.odemeTipi) throw new Error("Ödeme tipi seçilmelidir.");
  if (s.odemeTipi === "ACIK_HESAP" && !s.musteriId) {
    throw new Error("Açık hesap satış için müşteri seçilmelidir.");
  }
}

export function satisIdempotencyAnahtari(
  kullaniciId: string,
  cihazId: string,
  istemciIslemId: string
): string {
  return `${kullaniciId}:${cihazId}:${istemciIslemId}`;
}
