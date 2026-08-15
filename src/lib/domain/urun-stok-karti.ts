export interface UrunStokKarti {
  id: string;
  stokKodu: string;
  barkod?: string;
  marka: string;
  kategori: string;
  urunAdi: string;
  oemKodlari: string[];
  alternatifKodlar: string[];
  birim: "ADET" | "TAKIM" | "SET" | "LITRE" | "KUTU";
  kdvOrani: number;
  alisMaliyeti: number;
  satisFiyati: number;
  minimumStok: number;
  maksimumStok: number;
  mevcutStok: number;
  rafAdresi?: string;
  depoId?: string;
  aktif: boolean;
  notlar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UrunStokOzet {
  stokKodu: string;
  urunAdi: string;
  marka: string;
  mevcutStok: number;
  minimumStok: number;
  maksimumStok: number;
  stokDurumu: "KRITIK" | "NORMAL" | "FAZLA";
}

export function urunKartiniDogrula(
  urun: Omit<UrunStokKarti, "id" | "createdAt" | "updatedAt">
): void {
  if (!urun.stokKodu?.trim()) throw new Error("Stok kodu zorunlu.");
  if (!urun.urunAdi?.trim()) throw new Error("Ürün adı zorunlu.");
  if (!urun.marka?.trim()) throw new Error("Marka zorunlu.");
  if (!urun.kategori?.trim()) throw new Error("Kategori zorunlu.");
  if (!urun.oemKodlari.length) throw new Error("En az bir OEM kodu girilmeli.");
  if (!Number.isFinite(urun.kdvOrani) || urun.kdvOrani < 0) {
    throw new Error("KDV oranı geçersiz.");
  }
  if (!Number.isFinite(urun.alisMaliyeti) || urun.alisMaliyeti < 0) {
    throw new Error("Alış maliyeti geçersiz.");
  }
  if (!Number.isFinite(urun.satisFiyati) || urun.satisFiyati < 0) {
    throw new Error("Satış fiyatı geçersiz.");
  }
  if (urun.minimumStok < 0 || urun.maksimumStok < urun.minimumStok) {
    throw new Error("Minimum/maksimum stok aralığı geçersiz.");
  }
}

export function stokDurumu(
  mevcut: number,
  minimum: number,
  maksimum: number
): UrunStokOzet["stokDurumu"] {
  if (mevcut <= minimum) return "KRITIK";
  if (mevcut >= maksimum) return "FAZLA";
  return "NORMAL";
}

export function urunAramaMetni(urun: UrunStokKarti): string {
  return [
    urun.stokKodu,
    urun.barkod,
    urun.marka,
    urun.kategori,
    urun.urunAdi,
    ...urun.oemKodlari,
    ...urun.alternatifKodlari,
    urun.rafAdresi,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");
}
