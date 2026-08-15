export type BelgeSerisi =
  | "SF"   // Satış faturası
  | "AF"   // Alış faturası
  | "SI"   // Satış iade
  | "AI"   // Alış iade
  | "SP"   // Satış proforma
  | "AP";   // Alış proforma

export interface SeriAyari {
  seri: BelgeSerisi;
  yil: number;
  sonNumara: number;
  aktif: boolean;
}

export interface BelgeNoParcalari {
  seri: BelgeSerisi;
  yil: number;
  numara: number;
}

export function sonrakiBelgeNumarasi(
  seri: SeriAyari,
  yil: number
): { belgeNo: string; sonrakiSonNumara: number } {
  if (!seri.aktif) throw new Error("Belge serisi aktif değil.");
  if (seri.yil !== yil) throw new Error("Seri yılı ile belge yılı uyuşmuyor.");

  const next = seri.sonNumara + 1;
  if (next > 999999999) throw new Error("Belge numarası sınırına ulaşıldı.");

  const belgeNo = `${seri.seri}${yil}${String(next).padStart(9, "0")}`;

  return {
    belgeNo,
    sonrakiSonNumara: next,
  };
}

export function belgeNoParcala(belgeNo: string): BelgeNoParcalari {
  const match = /^(SF|AF|SI|AI|SP|AP)(\d{4})(\d{9})$/.exec(belgeNo);
  if (!match) throw new Error("Geçersiz belge numarası.");

  return {
    seri: match[1] as BelgeSerisi,
    yil: Number(match[2]),
    numara: Number(match[3]),
  };
}

export function belgeAramaMetniOlustur(
  belgeNo: string,
  musteriTedarikci?: string,
  kaynakBelgeNo?: string
): string {
  return [belgeNo, musteriTedarikci, kaynakBelgeNo]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}
