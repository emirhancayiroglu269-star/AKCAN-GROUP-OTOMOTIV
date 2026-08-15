import { kodNormalize, parcaTumBarkodlari } from "./barkod";
import { parcaRafListesi } from "./raf";
import { aracEtiketi } from "./arac";
import { metinBenzerligiYuzde } from "./veri-dogrulama";

// Tek arama kutusundan; ürün adı, marka, kategori, stok kodu, üretici parça
// kodu, barkod ve (normalize edilmiş) OEM/Muadil kodlarının HEPSİNDEN arar.
// "03L115562" / "03L 115 562" / "03L-115-562" hepsi aynı sonucu getirir.
// Bir OEM koduna doğrudan eşleşme bulununca, o OEM'e bağlı diğer TÜM markalı
// muadiller de (çapraz referans) otomatik sonuca eklenir.
export const hizliAramaYap = (db, sorgu) => {
  const qMetin = sorgu.trim().toLowerCase();
  const qNorm = kodNormalize(sorgu);
  if (!qMetin) return [];

  const metinEslesenler = db.parcalar.filter(
    (p) =>
      p.ad.toLowerCase().includes(qMetin) ||
      (p.marka || "").toLowerCase().includes(qMetin) ||
      (p.kategori || "").toLowerCase().includes(qMetin) ||
      (qNorm && kodNormalize(p.stokKodu).includes(qNorm)) ||
      (qNorm && kodNormalize(p.ureticiKodu).includes(qNorm)) ||
      (qNorm && parcaTumBarkodlari(p).some((b) => kodNormalize(b).includes(qNorm))) ||
      // Raf adresinde arama — "A bölümü" ya da tam raf kodu ("A-02-03") ile.
      parcaRafListesi(p).some((r) => kodNormalize(r.kod).includes(qNorm) || r.kod.toLowerCase().includes(qMetin))
  );
  const eslesenParcaIdleri = new Set(metinEslesenler.map((p) => p.id));

  if (qNorm) {
    const kodEslesenler = db.kodlar.filter((k) => kodNormalize(k.kod).includes(qNorm));
    kodEslesenler.forEach((k) => eslesenParcaIdleri.add(k.parcaId));

    // Doğrudan eşleşen ürünlerin TÜM OEM kodlarını topla, o OEM'lere bağlı
    // başka ürünleri de (farklı markalı muadiller) sonuç kümesine kat.
    const ilgiliOemNormKodlari = new Set(
      db.kodlar.filter((k) => k.tip === "OEM" && eslesenParcaIdleri.has(k.parcaId)).map((k) => kodNormalize(k.kod))
    );
    db.kodlar
      .filter((k) => k.tip === "OEM" && ilgiliOemNormKodlari.has(kodNormalize(k.kod)))
      .forEach((k) => eslesenParcaIdleri.add(k.parcaId));
  }

  // Araç adı/motoru üzerinden arama — "Golf 1.6 TDI" yazılınca o araca
  // uyumlu (Uyumsuz hariç) tüm ürünler de sonuca dahil olur.
  if (qMetin.length >= 3) {
    const eslesenAracIdleri = new Set(db.araclar.filter((a) => aracEtiketi(a).toLowerCase().includes(qMetin)).map((a) => a.id));
    if (eslesenAracIdleri.size > 0) {
      db.uyumluluklar.filter((u) => eslesenAracIdleri.has(u.aracId) && u.durum !== "Uyumsuz").forEach((u) => eslesenParcaIdleri.add(u.parcaId));
    }
  }

  return [...eslesenParcaIdleri]
    .map((id) => db.parcalar.find((p) => p.id === id))
    .filter(Boolean)
    .sort((a, b) => (b.stok > 0) - (a.stok > 0) || a.ad.localeCompare(b.ad, "tr"));
};

// "Bunu mu demek istediniz?" — tam/alt-dize eşleşmesi sonuç getirmediğinde,
// yazım hatalarını (39. adımdaki benzerlik fonksiyonuyla) tolere ederek en
// yakın ürün adı/stok kodu eşleşmelerini önerir.
export const yakinEslesmeOner = (db, sorgu) => {
  const q = sorgu.trim();
  if (q.length < 3) return [];
  return db.parcalar
    .map((p) => ({ parca: p, yuzde: Math.max(metinBenzerligiYuzde(q, p.ad), metinBenzerligiYuzde(q, p.stokKodu), metinBenzerligiYuzde(q, p.ureticiKodu)) }))
    .filter((x) => x.yuzde >= 60)
    .sort((a, b) => b.yuzde - a.yuzde)
    .slice(0, 5);
};

// Stok durumuna göre 🟢/🟡/🔴 sınıflandırması
export const stokDurumuHesapla = (p) => {
  if ((p.stok || 0) <= 0) return "yok";
  if (p.stok <= p.kritikSeviye) return "kritik";
  return "var";
};

// İade ekranında eski satışı bulmak için: Fiş/Belge No, Telefon, Müşteri adı
// veya Ürün Kodu/OEM üzerinden arar.
export const satisAramaYap = (db, sorgu) => {
  const q = sorgu.trim().toLowerCase();
  const qNorm = kodNormalize(sorgu);
  const telefonHane = sorgu.replace(/\D/g, "");
  if (!q) return [];
  return db.satislar
    .filter((s) => {
      const belgeNo = s.belgeNo || s.id.slice(-6).toUpperCase();
      if (belgeNo.toLowerCase().includes(q)) return true;
      if (s.musteriAdi.toLowerCase().includes(q)) return true;
      if ((s.satisiYapan || "").toLowerCase().includes(q)) return true;
      if (telefonHane.length >= 3) {
        const musteri = s.musteriId ? db.cariler.find((c) => c.id === s.musteriId) : null;
        if ((musteri?.telefon || s.musteriTelefon || "").replace(/\D/g, "").includes(telefonHane)) return true;
      }
      if (qNorm && s.kalemler.some((k) => kodNormalize(k.stokKodu).includes(qNorm))) return true;
      if (qNorm && s.kalemler.some((k) => db.kodlar.some((kd) => kd.parcaId === k.parcaId && kodNormalize(kd.kod).includes(qNorm)))) return true;
      return false;
    })
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
    .slice(0, 20);
};
