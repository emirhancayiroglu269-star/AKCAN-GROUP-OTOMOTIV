export type StokKarar = "AL" | "SATIS_DESTEKLE" | "DURDUR" | "IZLE";

export interface StokKararGirdisi {
  urunId: string;
  mevcutStok: number;
  rezerveStok: number;
  onerilenAlim: number;
  hiz: "HIZLI" | "NORMAL" | "YAVAS" | "OLU_STOK";
  abc: "A" | "B" | "C";
  xyz: "X" | "Y" | "Z";
  gunlukSatis: number;
  son30GunCiro: number;
  son30GunKar: number;
}

export interface StokKararSatiri {
  urunId: string;
  kullanilabilirStok: number;
  karar: StokKarar;
  oncelik: number;
  neden: string;
}

export interface StokDashboardOzet {
  toplamUrun: number;
  alinacakUrun: number;
  satisaDestekVerilecek: number;
  durdurulacak: number;
  izlenecek: number;
  toplamOnerilenAlim: number;
  son30GunCiro: number;
  son30GunKar: number;
}

export function stokKarariVer(g: StokKararGirdisi): StokKararSatiri {
  const kullanilabilirStok = Math.max(0, g.mevcutStok - g.rezerveStok);

  if (g.hiz === "OLU_STOK") {
    return {
      urunId: g.urunId,
      kullanilabilirStok,
      karar: "DURDUR",
      oncelik: 100,
      neden: "Ölü stok: satın alma durdur, kampanya/iade değerlendir.",
    };
  }

  if (g.onerilenAlim > 0) {
    return {
      urunId: g.urunId,
      kullanilabilirStok,
      karar: "AL",
      oncelik: g.abc === "A" ? 90 : g.abc === "B" ? 70 : 50,
      neden: "Stok ihtiyacı satış hızı ve rezervasyon dikkate alınarak oluştu.",
    };
  }

  if (g.hiz === "HIZLI" && g.gunlukSatis > 0) {
    return {
      urunId: g.urunId,
      kullanilabilirStok,
      karar: "SATIS_DESTEKLE",
      oncelik: g.abc === "A" ? 85 : 65,
      neden: "Hızlı dönen ürün: satış fırsatını koru.",
    };
  }

  return {
    urunId: g.urunId,
    kullanilabilirStok,
    karar: "IZLE",
    oncelik: g.abc === "A" ? 60 : 40,
    neden: "Periyodik stok ve satış kontrolü yeterli.",
  };
}

export function stokDashboardOzetle(
  satirlar: StokKararSatiri[],
  girdiler: StokKararGirdisi[]
): StokDashboardOzet {
  const toplamUrun = satirlar.length;

  return {
    toplamUrun,
    alinacakUrun: satirlar.filter(x => x.karar === "AL").length,
    satisaDestekVerilecek: satirlar.filter(x => x.karar === "SATIS_DESTEKLE").length,
    durdurulacak: satirlar.filter(x => x.karar === "DURDUR").length,
    izlenecek: satirlar.filter(x => x.karar === "IZLE").length,
    toplamOnerilenAlim: girdiler.reduce((s, x) => s + x.onerilenAlim, 0),
    son30GunCiro: girdiler.reduce((s, x) => s + x.son30GunCiro, 0),
    son30GunKar: girdiler.reduce((s, x) => s + x.son30GunKar, 0),
  };
}
