export const ICE_AKTARMA_ALANLARI = [
  { anahtar: "stokKodu", etiket: "Stok Kodu", zorunlu: true, tip: "metin" },
  { anahtar: "ad", etiket: "Ürün Adı", zorunlu: true, tip: "metin" },
  { anahtar: "marka", etiket: "Marka", zorunlu: false, tip: "metin" },
  { anahtar: "oem", etiket: "OEM", zorunlu: false, tip: "metin" },
  { anahtar: "ureticiKodu", etiket: "Üretici Kodu", zorunlu: false, tip: "metin" },
  { anahtar: "barkod", etiket: "Barkod", zorunlu: false, tip: "metin" },
  { anahtar: "kategori", etiket: "Kategori", zorunlu: false, tip: "metin" },
  { anahtar: "alisFiyati", etiket: "Alış Fiyatı", zorunlu: false, tip: "sayi" },
  { anahtar: "satisFiyati", etiket: "Satış Fiyatı", zorunlu: false, tip: "sayi" },
  { anahtar: "kdvOrani", etiket: "KDV", zorunlu: false, tip: "sayi" },
  { anahtar: "stok", etiket: "Stok", zorunlu: false, tip: "sayi" },
  { anahtar: "rafAdresi", etiket: "Raf", zorunlu: false, tip: "metin" },
  { anahtar: "kritikSeviye", etiket: "Minimum Stok", zorunlu: false, tip: "sayi" },
  { anahtar: "tedarikci", etiket: "Tedarikçi", zorunlu: false, tip: "metin" },
];

// Excel sütun adlarından program alanına otomatik eşleştirme önerisi —
// "Ürün Kodu → Stok Kodu", "Maliyet → Alış Fiyatı" gibi yaygın adlandırma
// farklarını tanır.
export const ICE_AKTARMA_OTOMATIK_ESLESME = {
  stokKodu: ["stok kodu", "stokkodu", "ürün kodu", "urun kodu", "kod", "parça kodu", "parca kodu", "sku"],
  ad: ["ürün adı", "urun adi", "ad", "ürün", "urun", "açıklama", "aciklama", "isim"],
  marka: ["marka", "brand"],
  oem: ["oem", "oem no", "oem kodu"],
  ureticiKodu: ["üretici kodu", "uretici kodu", "üretici no", "uretici no"],
  barkod: ["barkod", "barcode", "ean"],
  kategori: ["kategori", "category"],
  alisFiyati: ["alış fiyatı", "alis fiyati", "maliyet", "alış", "alis", "cost"],
  satisFiyati: ["satış fiyatı", "satis fiyati", "satış", "satis", "perakende fiyatı", "perakende fiyati", "fiyat", "price"],
  kdvOrani: ["kdv", "kdv oranı", "kdv orani", "vat", "tax"],
  stok: ["stok", "adet", "miktar", "stock", "qty"],
  rafAdresi: ["raf", "raf adresi", "konum", "location"],
  kritikSeviye: ["minimum stok", "min stok", "kritik seviye", "kritik stok"],
  tedarikci: ["tedarikçi", "tedarikci", "supplier"],
};

export const otomatikSutunOner = (alanAnahtari, csvBasliklari) => {
  const adaylar = ICE_AKTARMA_OTOMATIK_ESLESME[alanAnahtari] || [];
  const bulunan = csvBasliklari.find((b) => adaylar.includes(b.trim().toLowerCase()));
  return bulunan || "";
};

/* ------------------------------------------------------------------ */
/* ÜRÜN FOTOĞRAFI VE DOKÜMAN YÖNETİMİ — yardımcı fonksiyonlar          */
/* ------------------------------------------------------------------ */
export const FOTOGRAF_TURLERI = ["Ana Ürün", "Kutu", "Etiket / Barkod", "Teknik Detay", "Ölçü", "Diğer"];


export const DOKUMAN_TURLERI = ["Teknik Katalog", "Montaj Talimatı", "Ürün Datasheet'i", "Üretici Kataloğu", "Garanti Belgesi", "Sertifika", "Diğer"];
