export type MaliyetYontemi = "HAREKETLI_ORTALAMA" | "FIFO" | "SON_ALIS";

export interface MaliyetHareketi {
  id: string;
  urunId: string;
  tip: "GIRIS" | "CIKIS";
  miktar: number;
  birimMaliyet: number;
  tarih: string;
  kaynakBelgeId?: string;
}

export interface MaliyetSonucu {
  yontem: MaliyetYontemi;
  miktar: number;
  birimMaliyet: number;
  toplamMaliyet: number;
}

export function hareketliOrtalamaMaliyet(
  mevcutMiktar: number,
  mevcutBirimMaliyet: number,
  girisMiktari: number,
  girisBirimMaliyet: number
): MaliyetSonucu {
  if (
    mevcutMiktar < 0 ||
    girisMiktari <= 0 ||
    mevcutBirimMaliyet < 0 ||
    girisBirimMaliyet < 0
  ) {
    throw new Error("Maliyet girdileri geçersiz.");
  }

  const toplamMiktar = mevcutMiktar + girisMiktari;
  const toplamDeger =
    mevcutMiktar * mevcutBirimMaliyet +
    girisMiktari * girisBirimMaliyet;

  return {
    yontem: "HAREKETLI_ORTALAMA",
    miktar: toplamMiktar,
    birimMaliyet: toplamMiktar === 0 ? 0 : toplamDeger / toplamMiktar,
    toplamMaliyet: toplamDeger,
  };
}

export function sonAlisMaliyeti(
  girisBirimMaliyet: number
): MaliyetSonucu {
  if (girisBirimMaliyet < 0) {
    throw new Error("Son alış maliyeti negatif olamaz.");
  }

  return {
    yontem: "SON_ALIS",
    miktar: 0,
    birimMaliyet: girisBirimMaliyet,
    toplamMaliyet: 0,
  };
}

export function fifoMaliyetHesapla(
  katmanlar: Array<{ miktar: number; birimMaliyet: number }>,
  cikisMiktari: number
): { tuketilen: number; maliyet: number; kalan: Array<{ miktar: number; birimMaliyet: number }> } {
  if (cikisMiktari <= 0) throw new Error("Çıkış miktarı pozitif olmalı.");

  let kalanIhtiyac = cikisMiktari;
  let maliyet = 0;
  const kalan = katmanlar.map(x => ({ ...x }));

  for (const katman of kalan) {
    if (kalanIhtiyac <= 0) break;

    const kullan = Math.min(kalanIhtiyac, katman.miktar);
    maliyet += kullan * katman.birimMaliyet;
    katman.miktar -= kullan;
    kalanIhtiyac -= kullan;
  }

  if (kalanIhtiyac > 0) {
    throw new Error("FIFO için yeterli stok katmanı yok.");
  }

  return {
    tuketilen: cikisMiktari,
    maliyet,
    kalan: kalan.filter(x => x.miktar > 0),
  };
}

export function brutKarHesapla(
  netSatis: number,
  satilanMiktar: number,
  birimMaliyet: number
): number {
  if (netSatis < 0 || satilanMiktar < 0 || birimMaliyet < 0) {
    throw new Error("Kâr hesabı girdileri geçersiz.");
  }

  return netSatis - satilanMiktar * birimMaliyet;
}
