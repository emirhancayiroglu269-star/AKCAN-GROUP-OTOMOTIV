export interface BarkodUrun {
  id: string;
  stokKodu: string;
  barkod?: string;
  urunAdi: string;
  marka: string;
  birim: string;
  satisFiyati: number;
  kdvOrani: number;
  mevcutStok: number;
  rafAdresi?: string;
  aktif: boolean;
}

export interface HizliSatisSatiri {
  urunId: string;
  stokKodu: string;
  urunAdi: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
  toplam: number;
}

export function barkodNormalize(barkod: string): string {
  return barkod.replace(/[^0-9A-Za-z]/g, "").trim();
}

export function barkodAra(
  urunler: BarkodUrun[],
  sorgu: string
): BarkodUrun[] {
  const q = sorgu.trim().toLocaleLowerCase("tr-TR");
  if (!q) return [];

  return urunler.filter((u) =>
    [u.barkod, u.stokKodu, u.urunAdi, u.marka]
      .filter(Boolean)
      .some((v) => String(v).toLocaleLowerCase("tr-TR").includes(q))
  );
}

export function hizliSatisSatiriOlustur(
  urun: BarkodUrun,
  miktar = 1
): HizliSatisSatiri {
  if (!urun.aktif) throw new Error("Ürün satışa kapalı.");
  if (!Number.isInteger(miktar) || miktar <= 0) {
    throw new Error("Miktar pozitif tam sayı olmalı.");
  }
  if (urun.mevcutStok < miktar) {
    throw new Error("Yetersiz stok.");
  }

  return {
    urunId: urun.id,
    stokKodu: urun.stokKodu,
    urunAdi: urun.urunAdi,
    miktar,
    birimFiyat: urun.satisFiyati,
    kdvOrani: urun.kdvOrani,
    toplam: miktar * urun.satisFiyati,
  };
}

export function hizliSatisToplami(
  satirlar: HizliSatisSatiri[]
): number {
  return satirlar.reduce((t, s) => t + s.toplam, 0);
}
