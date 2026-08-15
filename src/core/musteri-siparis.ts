export const MUSTERI_SIPARIS_DURUMLARI = ["Bekliyor", "Tedarikçiye Sipariş Verildi", "Ürün Geldi", "Müşteriye Teslim Edildi", "İptal"];

export const musteriSiparisDurumGorseli = {
  Bekliyor: { emoji: "🔴", ton: "red" },
  "Tedarikçiye Sipariş Verildi": { emoji: "🔵", ton: "steel" },
  "Ürün Geldi": { emoji: "🟠", ton: "yellow" },
  "Müşteriye Teslim Edildi": { emoji: "🟢", ton: "green" },
  İptal: { emoji: "⚫", ton: "steel" },
};

// parcaRezerveAdedi / parcaKarsilanmisMusteriSiparisiAdedi / parcaBekleyenMusteriTalebi /
// parcaSatilabilirStok / suresiGecenRezervleriGuncelle artık ./lib/rezerv içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* HIZLI SATIŞ / FAVORİ ÜRÜNLER — paylaşılan yardımcı fonksiyonlar     */
/* ------------------------------------------------------------------ */
// Bir kullanıcının görebileceği favoriler: mağaza ortak favorileri (kullaniciId
// boş) + kendi kişisel favorileri.
export const gorunurFavoriler = (db, aktifKullanici) => {
  const kullaniciId = aktifKullanici?.id || null;
  return db.favoriler.filter((f) => !f.kullaniciId || f.kullaniciId === kullaniciId);
};


export const parcaFavoriMi = (db, parcaId, aktifKullanici) => gorunurFavoriler(db, aktifKullanici).some((f) => f.parcaId === parcaId);
