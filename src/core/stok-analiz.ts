import { isoGun } from "../lib/format";
import { gecerliMaliyet, kdvHaricSatisFiyati } from "../lib/maliyet";
import { parcaRafListesi } from "../lib/raf";
import { parcaRezerveAdedi, parcaKarsilanmisMusteriSiparisiAdedi, parcaSatilabilirStok } from "../lib/rezerv";
import { karOraniMargin, karOraniMarkup, satisKalemiKarBilgisi } from "../lib/maliyet";
import { sonNGunSatisAdedi, satisHiziSiniflandir, stokYasiGunu } from "../lib/olu-stok";
import { hepsi } from "../lib/constants";

// düşülmüş) verir — bugünkü satış fiyatı ne olursa olsun iade hep bu
// tarihi/gerçek fiyat üzerinden hesaplanır.
export const satisKalemiEfektifBirim = (k: any) => (k.adet > 0 ? (k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0)) / k.adet : 0);

/* ------------------------------------------------------------------ */
/* TOPLU FİYAT GÜNCELLEME SİSTEMİ                                      */
/* ------------------------------------------------------------------ */
export const YUVARLAMA_SECENEKLERI = [
  { deger: 0, etiket: "Yuvarlama Yok" },
  { deger: 1, etiket: "1₺'ye" },
  { deger: 5, etiket: "5₺'ye" },
  { deger: 10, etiket: "10₺'ye" },
  { deger: 50, etiket: "50₺'ye" },
  { deger: 100, etiket: "100₺'ye" },
];

// Bir ürünün güncel kâr oranı, genel hedef kâr ayarının altında mı? "Maliyeti
// Değişen Ürünler" filtresi ve ana uyarı bandı bu kontrolü kullanır.
export const hedefKarAltindaMi = (p: any, hedefKarAyari: any) => {
  const maliyet = gecerliMaliyet(p);
  if (maliyet <= 0 || !p.satisFiyati) return false;
  const guncelOran = hedefKarAyari.tur === "margin" ? karOraniMargin(p) : karOraniMarkup(p);
  return guncelOran !== null && guncelOran < hedefKarAyari.deger;
};

/* ------------------------------------------------------------------ */
/* STOK SAYIM VE DÜZELTME SİSTEMİ                                      */
/* ------------------------------------------------------------------ */
// Bir sayımın kapsamına giren ürünleri döndürür.
export const sayimKapsamindakiParcalar = (db: any, sayim: any) => {
  // Set ürünlerin kendi fiziksel stoğu yoktur (bileşenlerinden oluşur),
  // Stoksuz ürünler zaten hiç stok tutmaz — ikisi de sayım kapsamı dışıdır.
  const aktifler = db.parcalar.filter((p) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set");
  switch (sayim.kapsamTuru) {
    case "marka":
      return aktifler.filter((p) => p.marka === sayim.kapsamDeger);
    case "kategori":
      return aktifler.filter((p) => p.kategori === sayim.kapsamDeger);
    case "raf":
      return aktifler.filter((p) => parcaRafListesi(p).some((k) => k.kod === sayim.kapsamDeger));
    case "urunGrubu":
      return aktifler.filter((p) => (sayim.kapsamUrunIdleri || []).includes(p.id));
    default:
      return aktifler;
  }
};

// Bir sayımın özet istatistiklerini (adet ve parasal fark) hesaplar — hem
// devam eden sayımın canlı önizlemesinde hem de onaylanmış geçmiş sayımlarda
// aynı fonksiyon kullanılır.
export const sayimOzetiHesapla = (db: any, sayim: any) => {
  const parcalar = sayimKapsamindakiParcalar(db, sayim);
  let eksik = 0,
    fazla = 0,
    dogru = 0,
    sayilmayan = 0,
    eksikMaliyet = 0,
    fazlaMaliyet = 0;
  const satirlar = parcalar.map((p) => {
    const kayit = sayim.kalemler.find((k) => k.parcaId === p.id);
    const sayilan = kayit ? kayit.sayilanAdet : null;
    const sistemStogu = p.stok || 0;
    const fark = sayilan === null ? null : sayilan - sistemStogu;
    if (fark === null) sayilmayan++;
    else if (fark < 0) {
      eksik++;
      eksikMaliyet += -fark * gecerliMaliyet(p);
    } else if (fark > 0) {
      fazla++;
      fazlaMaliyet += fark * gecerliMaliyet(p);
    } else dogru++;
    return { p, sistemStogu, sayilan, fark };
  });
  return {
    satirlar,
    toplam: parcalar.length,
    eksik,
    fazla,
    dogru,
    sayilmayan,
    eksikMaliyet: Math.round(eksikMaliyet * 100) / 100,
    fazlaMaliyet: Math.round(fazlaMaliyet * 100) / 100,
    net: Math.round((fazlaMaliyet - eksikMaliyet) * 100) / 100,
  };
};

/* --- Stok Raporları --------------------------------------------------------- */
// Stok Değerleme Motoru (56. adım) — 46. adımdaki Kâr/Maliyet Hesaplama
// Motoruyla AYNI gecerliMaliyet(p, db) fonksiyonunu kullanır, böylece stok
// değeri her zaman satış anındaki/raporlardaki maliyetle tutarlıdır (9. madde).
const depoStogu = (p, depoId) => (p.depoStoklari || []).find((d) => d.depoId === depoId)?.adet || 0;

export const stokDegerlemeOzetiHesapla = (db: any, parcalar: any[]) => {
  const stokMaliyeti = (p) => (p.stok || 0) * gecerliMaliyet(p, db);
  const stokSatisDegeri = (p) => (p.stok || 0) * kdvHaricSatisFiyati(p);

  const toplamMaliyet = parcalar.reduce((t, p) => t + stokMaliyeti(p), 0);
  const toplamSatisDegeri = parcalar.reduce((t, p) => t + stokSatisDegeri(p), 0);

  const gruplaMaliyete = (anahtarFn) => {
    const harita: Record<string, number> = {};
    parcalar.forEach((p) => {
      const anahtar = anahtarFn(p) || "Belirtilmemiş";
      harita[anahtar] = (harita[anahtar] || 0) + stokMaliyeti(p);
    });
    return Object.entries(harita)
      .map(([anahtar, deger]) => ({ anahtar, deger }))
      .filter((x) => x.deger > 0)
      .sort((a, b) => b.deger - a.deger);
  };

  const bugunIso = isoGun(new Date());
  const gunFarki = (tarih: any) => Math.floor((new Date(bugunIso).getTime() - new Date(tarih).getTime()) / 86400000);
  const sonSatisTarihi = (parcaId) => {
    const satislar = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.kalemler.some((k) => k.parcaId === parcaId));
    if (satislar.length === 0) return null;
    return satislar.reduce((sonTarih, s) => (s.tarih > sonTarih ? s.tarih : sonTarih), satislar[0].tarih);
  };
  const oluStokGruplari = { "90+ gün": 0, "180+ gün": 0, "365+ gün": 0 };
  parcalar.forEach((p) => {
    if ((p.stok || 0) <= 0) return;
    const son = sonSatisTarihi(p.id);
    // Hiç satılmamışsa, ilk stok girişinden bu yana geçen süre referans alınır.
    const ilkHareket = son ? null : [...(db.stokHareketleri as any[])].filter((h) => h.parcaId === p.id).sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())[0];
    const referansTarih = son || ilkHareket?.tarih || null;
    if (!referansTarih) return;
    const gun = gunFarki(referansTarih);
    if (gun >= 365) oluStokGruplari["365+ gün"] += stokMaliyeti(p);
    else if (gun >= 180) oluStokGruplari["180+ gün"] += stokMaliyeti(p);
    else if (gun >= 90) oluStokGruplari["90+ gün"] += stokMaliyeti(p);
  });

  const kritikler = parcalar.filter((p) => (p.stok || 0) > 0 && p.stok <= p.kritikSeviye);
  const kritikMaliyet = kritikler.reduce((t, p) => t + stokMaliyeti(p), 0);

  // Rezerve stok (8. madde) — fiziksel stok ile satılabilir stok ayrı.
  const fizikselMaliyet = toplamMaliyet;
  const rezerveMaliyet = parcalar.reduce((t, p) => t + parcaRezerveAdedi(db, p.id) * gecerliMaliyet(p, db), 0);
  const satilabilirMaliyet = Math.max(0, fizikselMaliyet - rezerveMaliyet);

  const depoBazinda = (() => {
    if (db.depolar.length <= 1) return [];
    const harita: Record<string, number> = {};
    parcalar.forEach((p) => {
      (db.depolar || []).forEach((depo) => {
        const adet = depoStogu(p, depo.id);
        if (adet > 0) harita[depo.ad] = (harita[depo.ad] || 0) + adet * gecerliMaliyet(p, db);
      });
    });
    return Object.entries(harita).map(([anahtar, deger]) => ({ anahtar, deger })).sort((a, b) => b.deger - a.deger);
  })();

  return {
    toplamMaliyet,
    toplamSatisDegeri,
    potansiyelKar: toplamSatisDegeri - toplamMaliyet,
    kategoriBazinda: gruplaMaliyete((p) => p.kategori),
    markaBazinda: gruplaMaliyete((p) => p.marka),
    rafBazinda: gruplaMaliyete((p) => parcaRafListesi(p)[0]?.kod),
    depoBazinda,
    oluStokGruplari,
    kritikMaliyet,
    kritikAdet: kritikler.length,
    fizikselMaliyet,
    rezerveMaliyet,
    satilabilirMaliyet,
  };
};

/* ------------------------------------------------------------------ */
/* KULLANICI / PERSONEL VE YETKİLENDİRME SİSTEMİ                       */
/* ------------------------------------------------------------------ */
export const bosKullaniciForm = { adSoyad: "", kullaniciAdi: "", sifre: "", rolId: "rol-satis", aktif: true };

export const bosRolForm = { ad: "", yetkiler: hepsi(false), maksimumIskontoYuzdesi: "" };
