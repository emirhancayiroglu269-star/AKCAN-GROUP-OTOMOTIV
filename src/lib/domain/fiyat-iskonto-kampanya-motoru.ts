export type FiyatKaynagi =
  | "LISTE"
  | "MUSTERI_OZEL"
  | "TOPLU_ALIM"
  | "KAMPANYA";

export interface FiyatKural {
  id: string;
  urunId: string;
  musteriId?: string;
  minimumMiktar?: number;
  sabitFiyat?: number;
  indirimOrani?: number;
  oncelik: number;
  aktif: boolean;
  baslangic?: string;
  bitis?: string;
}

export interface FiyatSonucu {
  birimFiyat: number;
  kaynak: FiyatKaynagi;
  kuralId?: string;
}

export interface IndirimSonucu {
  brut: number;
  iskonto: number;
  net: number;
}

function tarihUygun(kural: FiyatKural, now = new Date()) {
  const t = now.getTime();
  if (kural.baslangic && t < new Date(kural.baslangic).getTime()) return false;
  if (kural.bitis && t > new Date(kural.bitis).getTime()) return false;
  return true;
}

export function enIyiFiyatiBul(
  listeFiyati: number,
  urunId: string,
  musteriId: string | undefined,
  miktar: number,
  kurallar: FiyatKural[],
  now = new Date()
): FiyatSonucu {
  if (listeFiyati < 0 || miktar <= 0) throw new Error("Fiyat/miktar geçersiz.");

  const uygun = kurallar
    .filter(k => k.aktif && k.urunId === urunId && tarihUygun(k, now))
    .filter(k => !k.musteriId || k.musteriId === musteriId)
    .filter(k => !k.minimumMiktar || miktar >= k.minimumMiktar)
    .sort((a, b) => a.oncelik - b.oncelik);

  for (const k of uygun) {
    const fiyat = k.sabitFiyat != null
      ? k.sabitFiyat
      : listeFiyati * (1 - (k.indirimOrani ?? 0) / 100);

    if (fiyat >= 0) {
      return {
        birimFiyat: fiyat,
        kaynak: k.musteriId ? "MUSTERI_OZEL"
          : k.minimumMiktar ? "TOPLU_ALIM"
          : "KAMPANYA",
        kuralId: k.id,
      };
    }
  }

  return { birimFiyat: listeFiyati, kaynak: "LISTE" };
}

export function iskontoHesapla(
  miktar: number,
  birimFiyat: number,
  iskontoOrani = 0
): IndirimSonucu {
  if (miktar <= 0 || birimFiyat < 0) throw new Error("Miktar/fiyat geçersiz.");
  if (iskontoOrani < 0 || iskontoOrani > 100) {
    throw new Error("İskonto oranı 0-100 arasında olmalı.");
  }

  const brut = miktar * birimFiyat;
  const iskonto = brut * iskontoOrani / 100;

  return {
    brut,
    iskonto,
    net: brut - iskonto,
  };
}
