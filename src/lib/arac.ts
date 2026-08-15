/* ------------------------------------------------------------------ */
/* ARAÇ UYUMLULUK SİSTEMİ                                               */
/* ------------------------------------------------------------------ */
export const UYUMLULUK_DURUMLARI = ["Kesin Uyumlu", "Kontrol Gerekli", "Uyumsuz"];
export const uyumlulukGorseli = { "Kesin Uyumlu": { emoji: "🟢", ton: "green" }, "Kontrol Gerekli": { emoji: "🟡", ton: "yellow" }, Uyumsuz: { emoji: "🔴", ton: "red" } };

// "VW Golf 7 1.6 TDI (2013–2017)" gibi okunabilir tek satır özet üretir.
export const aracEtiketi = (a) => `${a.marka} ${a.model} ${a.kasa ? a.kasa + " " : ""}${a.motor} (${a.yilBaslangic}–${a.yilBitis})`;

// Bir ürünün bağlı olduğu tüm araçları, uyumluluk durumuyla birlikte döner.
export const parcaUyumluAraclari = (db, parcaId) =>
  db.uyumluluklar
    .filter((u) => u.parcaId === parcaId)
    .map((u) => ({ ...u, arac: db.araclar.find((a) => a.id === u.aracId) }))
    .filter((u) => u.arac);

// Bir araca uyumlu, stokta bulunan (veya tüm) parçaları — Kesin/Kontrol
// öncelikli sırayla, kategoriye göre gruplamaya hazır biçimde döner.
export const aracUyumluParcalari = (db, aracId, sadeceStoklu = true) =>
  db.uyumluluklar
    .filter((u) => u.aracId === aracId && u.durum !== "Uyumsuz")
    .map((u) => ({ ...u, parca: db.parcalar.find((p) => p.id === u.parcaId) }))
    .filter((u) => u.parca && u.parca.aktif !== false && (!sadeceStoklu || u.parca.stok > 0))
    .sort((a, b) => (a.durum === b.durum ? 0 : a.durum === "Kesin Uyumlu" ? -1 : 1));
