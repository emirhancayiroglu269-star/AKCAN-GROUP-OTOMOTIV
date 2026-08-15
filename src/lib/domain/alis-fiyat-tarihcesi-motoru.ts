export interface AlisFiyatKaydi {
  id: string;
  urunId: string;
  tedarikciId: string;
  belgeId?: string;
  tarih: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
  paraBirimi: "TRY" | "USD" | "EUR";
  kur?: number;
}

export interface MaliyetDegisimAnalizi {
  eskiMaliyet: number;
  yeniMaliyet: number;
  fark: number;
  yuzdeDegisim: number;
  yon: "ARTIS" | "AZALIS" | "AYNI";
}

export function alisFiyatKaydiDogrula(k: AlisFiyatKaydi): void {
  if (!k.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if (!k.tedarikciId?.trim()) throw new Error("Tedarikçi zorunlu.");
  if (!Number.isFinite(k.miktar) || k.miktar <= 0) {
    throw new Error("Miktar pozitif olmalı.");
  }
  if (!Number.isFinite(k.birimFiyat) || k.birimFiyat < 0) {
    throw new Error("Birim alış fiyatı geçersiz.");
  }
  if (k.kdvOrani < 0) throw new Error("KDV oranı geçersiz.");
  if (k.paraBirimi !== "TRY" && (!k.kur || k.kur <= 0)) {
    throw new Error("Yabancı para alışında kur zorunlu.");
  }
}

export function maliyetDegisimAnalizi(
  eskiMaliyet: number,
  yeniMaliyet: number
): MaliyetDegisimAnalizi {
  if (eskiMaliyet < 0 || yeniMaliyet < 0) {
    throw new Error("Maliyet negatif olamaz.");
  }

  const fark = yeniMaliyet - eskiMaliyet;
  const yuzdeDegisim =
    eskiMaliyet === 0 ? (yeniMaliyet === 0 ? 0 : 100) : (fark / eskiMaliyet) * 100;

  return {
    eskiMaliyet,
    yeniMaliyet,
    fark,
    yuzdeDegisim,
    yon: fark > 0 ? "ARTIS" : fark < 0 ? "AZALIS" : "AYNI",
  };
}

export function tedarikciFiyatSirala(
  kayitlar: AlisFiyatKaydi[]
): AlisFiyatKaydi[] {
  return [...kayitlar].sort((a, b) => a.birimFiyat - b.birimFiyat);
}

export function kurlaTryMaliyet(
  birimFiyat: number,
  paraBirimi: AlisFiyatKaydi["paraBirimi"],
  kur = 1
): number {
  if (birimFiyat < 0 || kur <= 0) throw new Error("Fiyat/kur geçersiz.");
  return paraBirimi === "TRY" ? birimFiyat : birimFiyat * kur;
}
