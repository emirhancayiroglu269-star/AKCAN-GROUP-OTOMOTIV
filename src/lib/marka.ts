import { gecerliMaliyet, satisKalemiKarBilgisi } from "./maliyet";

export const MARKA_GRUPLARI = ["OEM", "Premium", "Orta", "Ekonomik"];

export const markaUrunleriBul = (db, marka) => db.parcalar.filter((p) => p.marka === marka.ad);

export const markaOzetHesapla = (db, marka) => {
  const urunler = markaUrunleriBul(db, marka);
  const toplamStok = urunler.reduce((t, p) => t + (p.stok || 0), 0);
  const stokMaliyeti = urunler.reduce((t, p) => t + (p.stok || 0) * gecerliMaliyet(p), 0);
  const ayBasi = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const parcaIdSeti = new Set(urunler.map((p) => p.id));
  let aylikSatisAdedi = 0;
  let aylikCiro = 0;
  let aylikKar = 0;
  db.satislar.forEach((s) => {
    if (s.durum === "İptal Edildi" || new Date(s.tarih) < ayBasi) return;
    s.kalemler.forEach((k) => {
      if (!parcaIdSeti.has(k.parcaId)) return;
      aylikSatisAdedi += k.adet;
      aylikCiro += k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0);
      aylikKar += satisKalemiKarBilgisi(k).karToplam;
    });
  });
  return { urunler, toplamUrun: urunler.length, toplamStok, stokMaliyeti, aylikSatisAdedi, aylikCiro, aylikKar };
};
