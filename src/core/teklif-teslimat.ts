import { isoGun, yeniId } from "../lib/format";

export const teklifDurumGorseli = {
  Taslak: { emoji: "🟡", ton: "yellow" },
  Gönderildi: { emoji: "🔵", ton: "steel" },
  Onaylandı: { emoji: "🟢", ton: "green" },
  Reddedildi: { emoji: "🔴", ton: "red" },
  "Süresi Doldu": { emoji: "⚫", ton: "steel" },
  "Satışa Dönüştü": { emoji: "🟣", ton: "yellow" },
};

export const teklifKalemNetTutar = (k) => {
  const ham = (k.adet || 0) * (k.birimFiyat || 0);
  const iskontoTutari = k.iskontoTuru === "yuzde" ? ham * ((k.iskontoDeger || 0) / 100) : k.iskontoDeger || 0;
  const kdvHaric = ham - iskontoTutari;
  return kdvHaric * (1 + (k.kdvOrani || 0) / 100);
};

export const teklifGenelToplam = (teklif) => teklif.kalemler.reduce((t, k) => t + teklifKalemNetTutar(k), 0);

// Geçerlilik tarihi geçmiş ama hâlâ Taslak/Gönderildi'de kalan teklifleri
// otomatik "Süresi Doldu" yapar — sayfa her açıldığında çalıştırılır.
export const teklifSureleriGuncelle = (db) => {
  const bugunIso = isoGun(new Date());
  const guncellenecek = db.teklifler.filter((t) => (t.durum === "Taslak" || t.durum === "Gönderildi") && t.gecerlilikTarihi && t.gecerlilikTarihi < bugunIso);
  if (guncellenecek.length === 0) return db;
  return { ...db, teklifler: db.teklifler.map((t) => (guncellenecek.some((g) => g.id === t.id) ? { ...t, durum: "Süresi Doldu" } : t)) };
};

export const bosTeklifForm = { musteriAdi: "", tarih: isoGun(new Date()), gecerlilikTarihi: isoGun(new Date(Date.now() + 7 * 86400000)), aciklama: "", rezerveEt: false };

/* ------------------------------------------------------------------ */
/* KARGO / TESLİMAT TAKİBİ                                             */
/* ------------------------------------------------------------------ */
export const TESLIMAT_TIPLERI = ["Mağazadan Teslim", "Kurye", "Kargo"];

export const TESLIMAT_DURUMLARI = ["Hazırlanıyor", "Paketlendi", "Kargoya Verildi", "Dağıtımda", "Teslim Edildi", "İptal", "İade Edildi"];

export const teslimatDurumGorseli = {
  Hazırlanıyor: { emoji: "🟡", ton: "yellow" },
  Paketlendi: { emoji: "🔵", ton: "steel" },
  "Kargoya Verildi": { emoji: "🟠", ton: "yellow" },
  Dağıtımda: { emoji: "🟣", ton: "yellow" },
  "Teslim Edildi": { emoji: "🟢", ton: "green" },
  İptal: { emoji: "🔴", ton: "red" },
  "İade Edildi": { emoji: "⚫", ton: "steel" },
};

export const bosPaket = () => ({ id: yeniId("pk"), paketNo: 1, kargoTakipNo: "", agirlikKg: "", desi: "", kargoUcreti: "" });

/* ------------------------------------------------------------------ */
/* TEDARİKÇİ FİYAT KARŞILAŞTIRMA SAYFASI                               */
