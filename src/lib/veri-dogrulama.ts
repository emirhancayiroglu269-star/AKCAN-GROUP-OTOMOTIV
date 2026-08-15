import { kodNormalize, parcaBarkodEslesiyorMu } from "./barkod";

// İki metin arasındaki benzerliği (Levenshtein mesafesine dayalı) 0-100
// arası bir yüzde olarak döner — "MANN HU719/7X" ile "MANN HU719-7X" gibi
// yazım farklarını yakalamak için kullanılır.
export const metinBenzerligiYuzde = (a, b) => {
  const s1 = (a || "").trim().toLowerCase();
  const s2 = (b || "").trim().toLowerCase();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  const uzunA = s1.length;
  const uzunB = s2.length;
  const matris = Array.from({ length: uzunA + 1 }, (_, i) => [i, ...Array(uzunB).fill(0)]);
  for (let j = 0; j <= uzunB; j++) matris[0][j] = j;
  for (let i = 1; i <= uzunA; i++) {
    for (let j = 1; j <= uzunB; j++) {
      const maliyet = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matris[i][j] = Math.min(matris[i - 1][j] + 1, matris[i][j - 1] + 1, matris[i - 1][j - 1] + maliyet);
    }
  }
  const mesafe = matris[uzunA][uzunB];
  const maksUzunluk = Math.max(uzunA, uzunB);
  return Math.round((1 - mesafe / maksUzunluk) * 100);
};

// Yeni bir ürün eklenmeden/güncellenmeden önce olası mükerrer kayıtları
// bulur — Stok Kodu / Üretici Kodu / Barkod TAM eşleşmesi arar (bunlar
// UNIQUE olmalıdır). OEM kasıtlı olarak bu kontrole DAHİL EDİLMEZ, çünkü
// aynı OEM'e birden fazla marka/ürün bağlanabilir (bkz. 39. adım #2).
export const mukerrerUrunBul = (db, aday, haricTutulanId) => {
  const stokKoduNorm = kodNormalize(aday.stokKodu);
  const ureticiKoduNorm = kodNormalize(aday.ureticiKodu);
  const barkodDeger = (aday.barkod || "").trim();
  return db.parcalar.find((p) => {
    if (p.id === haricTutulanId) return false;
    if (stokKoduNorm && kodNormalize(p.stokKodu) === stokKoduNorm) return true;
    if (ureticiKoduNorm && aday.marka && kodNormalize(p.ureticiKodu) === ureticiKoduNorm && p.marka.toLowerCase() === aday.marka.trim().toLowerCase()) return true;
    if (barkodDeger && parcaBarkodEslesiyorMu(p, barkodDeger)) return true;
    return false;
  });
};

// "Benzer ürün önerisi" — yazım hatalarını yakalamak için ürün adı bazında
// yüksek benzerlikli (>=%85) ama TAM AYNI olmayan kayıtları bulur.
export const benzerUrunleriBul = (db, ad, haricTutulanId) => {
  if (!ad || ad.trim().length < 4) return [];
  return db.parcalar
    .filter((p) => p.id !== haricTutulanId)
    .map((p) => ({ parca: p, yuzde: metinBenzerligiYuzde(ad, p.ad) }))
    .filter((x) => x.yuzde >= 85 && x.yuzde < 100)
    .sort((a, b) => b.yuzde - a.yuzde)
    .slice(0, 3);
};
