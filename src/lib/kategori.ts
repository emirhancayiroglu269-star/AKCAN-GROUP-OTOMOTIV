import { gecerliMaliyet, kdvHaricSatisFiyati } from "./maliyet";

export const anaKategoriler = (db) => db.kategoriler.filter((k) => !k.ustKategoriId);
export const altKategoriler = (db, anaKategoriId) => db.kategoriler.filter((k) => k.ustKategoriId === anaKategoriId);

// Bir kategorinin özel alanları: ana kategoriyse kendi alanları; alt
// kategoriyse hem bağlı olduğu ana kategorinin hem kendi alanlarının
// birleşimi (Filtre örneğindeki gibi ana kategoride tanımlı ortak alanlar,
// Fren Balatası örneğindeki gibi alt kategoriye özel alanlarla birlikte gelir).
export const kategoriOzelAlanlari = (db, kategori) => {
  if (!kategori) return [];
  if (!kategori.ustKategoriId) return kategori.ozelAlanlar || [];
  const ust = db.kategoriler.find((k) => k.id === kategori.ustKategoriId);
  return [...(ust?.ozelAlanlar || []), ...(kategori.ozelAlanlar || [])];
};

// p.kategori (geriye dönük uyumlu alan) ALT kategori adını taşır; ana
// kategori doğrudan seçiliyse (alt kategorisiz) ana kategori adını taşır.
export const kategoriUrunleriBul = (db, kategori) => {
  if (!kategori) return [];
  if (!kategori.ustKategoriId) return db.parcalar.filter((p) => p.anaKategori === kategori.ad);
  return db.parcalar.filter((p) => p.kategori === kategori.ad);
};

export const kategoriOzetHesapla = (db, kategori) => {
  const urunler = kategoriUrunleriBul(db, kategori);
  const toplamStok = urunler.reduce((t, p) => t + (p.stok || 0), 0);
  const stokMaliyeti = urunler.reduce((t, p) => t + (p.stok || 0) * gecerliMaliyet(p), 0);
  const satisDegeri = urunler.reduce((t, p) => t + (p.stok || 0) * kdvHaricSatisFiyati(p), 0);
  return { urunler, toplamUrun: urunler.length, toplamStok, stokMaliyeti, satisDegeri, kar: satisDegeri - stokMaliyeti };
};
