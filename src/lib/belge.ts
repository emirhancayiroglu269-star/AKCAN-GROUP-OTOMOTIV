import { BELGE_TUR_ONEKLERI } from "./constants";

// Sıralı, tekrar kullanılmayan belge numarası üretir: "ST-2026-000001" gibi.
// Önek, Ayarlar → Belge sekmesinden özelleştirilebilir (db.ayarlar.belgeOnekleri);
// hiç özelleştirilmediyse yukarıdaki varsayılanlar kullanılır. Sayaç yıl+tür
// bazında ayrı tutulur, saf bir fonksiyondur — updateDb içinde hem numara
// üretimi hem sayaç güncellemesi TEK adımda yapılmalıdır.
// Bilinmeyen belge türü SESSİZCE "ST" önekine düşmemeli: düşerse satış fişi ile
// başka bir belge aynı sayacı paylaşır ve numaralar çakışır. Geliştirme
// sırasında gürültülü uyarı verilir (üretimde konsolu kirletmez).
const bilinmeyenBelgeTurleri = new Set<string>();

export const yeniBelgeNumarasiUret = (db: any, belgeTuru) => {
  let onEk = db.ayarlar?.belgeOnekleri?.[belgeTuru] || BELGE_TUR_ONEKLERI[belgeTuru];
  if (!onEk) {
    onEk = "ST";
    if (belgeTuru && !bilinmeyenBelgeTurleri.has(belgeTuru)) {
      bilinmeyenBelgeTurleri.add(belgeTuru);
      if (typeof console !== "undefined") {
        console.warn(
          `[belge] Tanımsız belge türü "${belgeTuru}" — "ST" öneki ve SATIŞ sayacı kullanılıyor. ` +
            `Geçerli türler: ${Object.keys(BELGE_TUR_ONEKLERI).join(", ")}`
        );
      }
    }
  }
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
