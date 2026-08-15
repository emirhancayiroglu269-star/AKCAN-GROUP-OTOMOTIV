export const SIPARIS_DURUMLARI = ["Taslak", "Sipariş Verildi", "Kısmi Geldi", "Tamamlandı", "İptal"];

export const siparisDurumGorseli = {
  Taslak: { emoji: "🟡", ton: "yellow" },
  "Sipariş Verildi": { emoji: "🔵", ton: "steel" },
  "Kısmi Geldi": { emoji: "🟠", ton: "yellow" },
  Tamamlandı: { emoji: "🟢", ton: "green" },
  İptal: { emoji: "🔴", ton: "red" },
};

export const siparisKalemNetToplam = (k) => {
  const ham = (k.adet || 0) * (k.birimFiyat || 0);
  const iskontoTutari = ham * ((k.iskontoYuzde || 0) / 100);
  const kdvHaric = ham - iskontoTutari;
  return kdvHaric * (1 + (k.kdvOrani || 0) / 100);
};

export const siparisGenelToplam = (siparis) => siparis.kalemler.reduce((t, k) => t + siparisKalemNetToplam(k), 0);

export const siparisToplamAdet = (siparis) => siparis.kalemler.reduce((t, k) => t + (k.adet || 0), 0);

export const siparisAlinanAdet = (siparis) => siparis.kalemler.reduce((t, k) => t + (k.alinanAdet || 0), 0);

/* ------------------------------------------------------------------ */
/* DEPOLAR / STOK TRANSFERİ — paylaşılan yardımcı fonksiyonlar         */
