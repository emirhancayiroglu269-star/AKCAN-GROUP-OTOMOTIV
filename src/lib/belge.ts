import { BELGE_TUR_ONEKLERI } from "./constants";

// Sıralı, tekrar kullanılmayan belge numarası üretir: "ST-2026-000001" gibi.
// Önek, Ayarlar → Belge sekmesinden özelleştirilebilir (db.ayarlar.belgeOnekleri);
// hiç özelleştirilmediyse yukarıdaki varsayılanlar kullanılır. Sayaç yıl+tür
// bazında ayrı tutulur, saf bir fonksiyondur — updateDb içinde hem numara
// üretimi hem sayaç güncellemesi TEK adımda yapılmalıdır.
export const yeniBelgeNumarasiUret = (db, belgeTuru) => {
  const onEk = db.ayarlar?.belgeOnekleri?.[belgeTuru] || BELGE_TUR_ONEKLERI[belgeTuru] || "ST";
  const yil = new Date().getFullYear();
  const anahtar = `${onEk}-${yil}`;
  const siraSonraki = (db.belgeSayaclari?.[anahtar] || 0) + 1;
  return { belgeNo: `${anahtar}-${String(siraSonraki).padStart(6, "0")}`, anahtar, siraSonraki };
};

export const belgeSayaciGuncelle = (prev, anahtar, siraSonraki) => ({ ...prev, belgeSayaclari: { ...prev.belgeSayaclari, [anahtar]: siraSonraki } });

// Eski (bu sistem kurulmadan önce oluşturulmuş) satış kayıtlarında belgeNo
// alanı olmayabilir — bu durumda geriye dönük uyumluluk için kısa id
// gösterimine düşer.
export const satisBelgeNoGoster = (s) => s.belgeNo || s.id.slice(-6).toUpperCase();
