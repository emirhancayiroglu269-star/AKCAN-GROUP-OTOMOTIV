export const veriSkoru = (veri) => {
  if (!veri || typeof veri !== "object") return 0;
  return ["parcalar", "satislar", "malAlimlari", "cariler", "tedarikciler", "kullanicilar", "islemGecmisi", "girisGecmisi", "giderler", "hesaplar"]
    .reduce((t, k) => t + (Array.isArray(veri[k]) ? veri[k].length : 0), 0);
};


export const tl = (n) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(n) || 0);

export const bugun = () =>
  new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const tarihGoster = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "-";
  }
};

export const isoGun = (deger = new Date()) => {
  const d = deger instanceof Date ? deger : new Date(deger);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${gun}`;
};

export const guvenliZamanDamgasi = () => {
  const d = new Date();
  return Date.prototype.toISOString.call(d);
};

export const zamanDamgasi = guvenliZamanDamgasi;

let idCounter = 0;
export const yeniId = (prefix) => {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
};
