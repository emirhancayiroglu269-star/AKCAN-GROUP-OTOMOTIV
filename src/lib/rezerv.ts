import { isoGun } from "./format";

export const REZERV_DURUMLARI = ["Bekliyor", "Teslim Edildi", "Süresi Doldu", "İptal Edildi"];
export const rezervDurumGorseli = {
  Bekliyor: { emoji: "🟡", ton: "yellow" },
  "Teslim Edildi": { emoji: "🟢", ton: "green" },
  "Süresi Doldu": { emoji: "🔴", ton: "red" },
  "İptal Edildi": { emoji: "⚫", ton: "steel" },
};

// Bir ürün için hâlâ "Bekliyor" durumundaki tüm rezervlerin toplam adedi.
export const parcaRezerveAdedi = (db, parcaId) =>
  db.rezervler.filter((r) => r.parcaId === parcaId && r.durum === "Bekliyor").reduce((t, r) => t + r.adet, 0);

// Bir ürün için "Ürün Geldi" durumundaki (fiziksel karşılığı gelmiş, müşteri
// teslim almayı bekleyen) müşteri siparişlerinin toplam adedi. Bunlar da
// Rezerv'deki "Bekliyor" gibi satılabilir stoktan düşülmelidir — çünkü bu
// stok artık BAŞKA bir müşteriye satılmamalıdır.
export const parcaKarsilanmisMusteriSiparisiAdedi = (db, parcaId) =>
  db.musteriSiparisleri.filter((s) => s.parcaId === parcaId && s.durum === "Ürün Geldi").reduce((t, s) => t + s.adet, 0);

// Bir ürün için HENÜZ karşılanmamış ("Bekliyor" veya "Tedarikçiye Sipariş
// Verildi") müşteri talebi toplamı — bunların fiziksel karşılığı henüz
// yoktur, bu yüzden satılabilir stoktan düşülmezler; sadece Satın Alma
// ekranında "bekleyen müşteri talebi" olarak bilgilendirme amaçlı gösterilir.
export const parcaBekleyenMusteriTalebi = (db, parcaId) =>
  db.musteriSiparisleri
    .filter((s) => s.parcaId === parcaId && (s.durum === "Bekliyor" || s.durum === "Tedarikçiye Sipariş Verildi"))
    .reduce((t, s) => t + s.adet, 0);

// Satılabilir Stok = Fiziksel Stok − Rezerve Adet − Karşılanmış (Ürün
// Geldi) Müşteri Siparişi Adedi. Satış ekranı ve stok kontrolleri, ürünün
// ham stoğu yerine BUNU esas almalıdır.
export const parcaSatilabilirStok = (db, p) =>
  Math.max(0, (p.stok || 0) - parcaRezerveAdedi(db, p.id) - parcaKarsilanmisMusteriSiparisiAdedi(db, p.id));

// Süresi geçmiş "Bekliyor" rezervleri "Süresi Doldu"ya çevirir — ürün stoğu
// bu sayede otomatik olarak tekrar satılabilir hale döner (rezerve adedi bu
// hesaplamadan düşer). Saf bir fonksiyondur, updateDb içinde kullanılır.
export const suresiGecenRezervleriGuncelle = (db) => {
  const bugunIso = isoGun(new Date());
  let degisti = false;
  const rezervler = db.rezervler.map((r) => {
    if (r.durum === "Bekliyor" && r.sonGecerlilikTarihi && r.sonGecerlilikTarihi < bugunIso) {
      degisti = true;
      return { ...r, durum: "Süresi Doldu" };
    }
    return r;
  });
  return degisti ? { ...db, rezervler } : db;
};
