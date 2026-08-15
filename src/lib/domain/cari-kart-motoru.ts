export type CariKartTipi = "MUSTERI" | "TEDARIKCI";

export interface CariKart {
  id: string;
  kod: string;
  tip: CariKartTipi;
  unvan: string;
  yetkiliAdi?: string;
  telefon?: string;
  email?: string;
  vergiDairesi?: string;
  vergiNo?: string;
  tcKimlikNo?: string;
  adres?: string;
  il?: string;
  ilce?: string;
  postaKodu?: string;
  notlar?: string;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CariKartOzet {
  cariId: string;
  unvan: string;
  tip: CariKartTipi;
  borc: number;
  alacak: number;
  bakiye: number;
}

export function cariKartDogrula(
  kart: Omit<CariKart, "id" | "createdAt" | "updatedAt">
): void {
  if (!kart.kod?.trim()) throw new Error("Cari kodu zorunlu.");
  if (!kart.unvan?.trim()) throw new Error("Cari unvan zorunlu.");
  if (!["MUSTERI", "TEDARIKCI"].includes(kart.tip)) {
    throw new Error("Cari tipi geçersiz.");
  }

  if (kart.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kart.email)) {
    throw new Error("E-posta formatı geçersiz.");
  }

  if (kart.vergiNo && !/^\d{10}$/.test(kart.vergiNo)) {
    throw new Error("Vergi numarası 10 haneli olmalı.");
  }

  if (kart.tcKimlikNo && !/^\d{11}$/.test(kart.tcKimlikNo)) {
    throw new Error("T.C. kimlik numarası 11 haneli olmalı.");
  }
}

export function cariAramaMetni(kart: CariKart): string {
  return [
    kart.kod,
    kart.unvan,
    kart.yetkiliAdi,
    kart.telefon,
    kart.email,
    kart.vergiNo,
    kart.tcKimlikNo,
    kart.il,
    kart.ilce,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}

export function cariBakiyeDurumu(
  borc: number,
  alacak: number
): CariKartOzet["bakiye"] {
  return alacak - borc;
}
