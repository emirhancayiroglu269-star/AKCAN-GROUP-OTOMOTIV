import { yeniId } from "./format";

// "03L 115 562", "03L-115-562", "03L115562" gibi farklı yazımların hepsini
// aynı koda indirger: boşluk/tire kaldırılır, büyük harfe çevrilir.
export const kodNormalize = (kod) => (kod || "").toUpperCase().replace(/[\s\-]/g, "");

// Barkod, Stok Kodu / OEM / Üretici Kodu / Muadil Kod'un YERİNE geçmez —
// bilinçli olarak ayrı bir alan (p.barkodlar dizisi) olarak tutulur. Bir
// ürüne birden fazla barkod bağlanabilir; p.barkod bunlardan ilki (birincil,
// tablolarda/etikette gösterilen) ile senkron tutulur.
export const parcaTumBarkodlari = (p) => (p.barkodlar && p.barkodlar.length > 0 ? p.barkodlar : p.barkod ? [p.barkod] : []);
export const parcaBarkodEslesiyorMu = (p, kod) => {
  const k = (kod || "").trim();
  if (!k) return false;
  return parcaTumBarkodlari(p).some((b) => b.trim() === k);
};
export const barkodluParcaBul = (parcalar, kod) => parcalar.find((p) => parcaBarkodEslesiyorMu(p, kod));

// EAN-13 barkod hesaplama ve çizim mantığı.

export const ean13KontrolHanesi = (digits12) => {
  let toplam = 0;
  for (let i = 0; i < 12; i++) toplam += parseInt(digits12[i], 10) * (i % 2 === 0 ? 1 : 3);
  return (10 - (toplam % 10)) % 10;
};

// Not: otomatikBarkodUret App.tsx içinde kalır (parcaTumBarkodlari'a bağlı).

// EAN-13 çubuk desenleri (7 modüllük ikili örüntüler) — L (sol/tek), G (sol/çift), R (sağ).
export const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
export const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
export const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
// İlk hanenin, 2-7. hanelerin L mi G mi kullanacağını belirleyen eşlik deseni.
export const EAN_PARITE = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

// 12 veya 13 haneli bir sayıyı geçerli bir EAN-13'e tamamlar/hesaplar ve
// çizilecek modülleri (0=boşluk, 1=çubuk) 95 elemanlık bir dizi olarak döner.
export const ean13Modulleri = (kodHam) => {
  const rakamlar = (kodHam || "").replace(/\D/g, "").padStart(12, "0").slice(0, 12);
  const kontrol = ean13KontrolHanesi(rakamlar);
  const tumRakamlar = rakamlar + kontrol;
  const parite = EAN_PARITE[parseInt(tumRakamlar[0], 10)];
  let modul = "101"; // başlangıç koruma çubuğu
  for (let i = 0; i < 6; i++) {
    const hane = parseInt(tumRakamlar[i + 1], 10);
    modul += parite[i] === "L" ? EAN_L[hane] : EAN_G[hane];
  }
  modul += "01010"; // orta koruma çubuğu
  for (let i = 0; i < 6; i++) {
    modul += EAN_R[parseInt(tumRakamlar[i + 7], 10)];
  }
  modul += "101"; // bitiş koruma çubuğu
  return { modul, kod: tumRakamlar };
};
