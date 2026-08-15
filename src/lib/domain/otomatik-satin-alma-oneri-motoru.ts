export interface SatinAlmaOneriGirdisi {
  urunId: string;
  mevcutStok: number;
  rezerveStok: number;
  minimumStok: number;
  maksimumStok: number;
  gunlukOrtalamaSatis: number;
  tedarikSuresiGun: number;
  guvenlikStoku: number;
  tedarikciPuan: number;
}

export interface SatinAlmaOnerisi {
  urunId: string;
  kullanilabilirStok: number;
  tedarikSuresiTalebi: number;
  hedefStok: number;
  onerilenAlim: number;
  aciliyet: "ACIL" | "ONCELIKLI" | "NORMAL" | "ALMA";
  gerekce: string;
}

export function satinAlmaOnerisiOlustur(
  g: SatinAlmaOneriGirdisi
): SatinAlmaOnerisi {
  if (!g.urunId?.trim()) throw new Error("Ürün zorunlu.");
  if ([g.mevcutStok, g.rezerveStok, g.minimumStok, g.maksimumStok,
    g.gunlukOrtalamaSatis, g.tedarikSuresiGun, g.guvenlikStoku].some(v => v < 0)) {
    throw new Error("Stok/satış değerleri negatif olamaz.");
  }
  if (g.maksimumStok < g.minimumStok) {
    throw new Error("Maksimum stok minimum stoktan küçük olamaz.");
  }

  const kullanilabilirStok = Math.max(0, g.mevcutStok - g.rezerveStok);
  const tedarikSuresiTalebi =
    g.gunlukOrtalamaSatis * g.tedarikSuresiGun;
  const hedefStok = Math.min(
    g.maksimumStok,
    Math.max(g.minimumStok, tedarikSuresiTalebi + g.guvenlikStoku)
  );
  const onerilenAlim = Math.max(0, Math.ceil(hedefStok - kullanilabilirStok));

  let aciliyet: SatinAlmaOnerisi["aciliyet"] = "ALMA";
  if (onerilenAlim > 0) {
    if (kullanilabilirStok <= g.minimumStok) aciliyet = "ACIL";
    else if (kullanilabilirStok < tedarikSuresiTalebi) aciliyet = "ONCELIKLI";
    else aciliyet = "NORMAL";
  }

  const gerekce = onerilenAlim === 0
    ? "Kullanılabilir stok mevcut ihtiyacı karşılıyor."
    : `Satış hızı, tedarik süresi, minimum/maksimum stok ve rezervasyon dikkate alınarak ${onerilenAlim} adet önerildi.`;

  return {
    urunId: g.urunId,
    kullanilabilirStok,
    tedarikSuresiTalebi,
    hedefStok,
    onerilenAlim,
    aciliyet,
    gerekce,
  };
}
