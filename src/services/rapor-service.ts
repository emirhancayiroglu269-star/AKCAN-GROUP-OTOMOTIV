/* Finansal, dönemsel ve yönetim raporu yardımcıları */
import { isoGun, zamanDamgasi } from "../lib/format";
import { satisKalemiKarBilgisi } from "../lib/maliyet";
import { satisKalemiListeKari } from "../lib/maliyet";
import { satisHiziSiniflandir } from "../lib/olu-stok";
import { tedarikciAcikFaturalari } from "../core/tedarikci-cari";
import { fiyatDegisimYuzdesi } from "./stok-service";

/* ------------------------------------------------------------------ */
/* MAL ALIŞ / MAL KABUL                                                */
/* ------------------------------------------------------------------ */
// Bir satırın KDV HARİÇ, iskonto sonrası birim net maliyeti.
// FIFO simülasyonuyla her satış için yaklaşık bir "ödenen/kalan" tablosu
// üretir; toplamı her zaman müşterinin gerçek güncel bakiyesiyle tutarlıdır.
export const musteriAcikFaturalariFifo = (db, musteri) => {
  const acikHesapSatislari = db.satislar
    .filter((s) => s.durum !== "İptal Edildi" && (musteri.id ? s.musteriId === musteri.id : s.musteriAdi.toLowerCase() === musteri.ad.toLowerCase()))
    .filter((s) => (s.odemeler || []).some((o) => o.yontem === "Açık Hesap" && o.tutar > 0))
    .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
  const toplamTahsilat = musteri.hareketler.filter((h) => h.tur === "ödeme").reduce((t, h) => t + h.tutar, 0);
  let kalanHavuz = toplamTahsilat;
  return acikHesapSatislari.map((s) => {
    const acikTutar = s.odemeler.filter((o) => o.yontem === "Açık Hesap").reduce((t, o) => t + o.tutar, 0);
    const buFaturayaUygulanan = Math.min(kalanHavuz, acikTutar);
    kalanHavuz -= buFaturayaUygulanan;
    // Müşteri satışlarında faturaya özel bir vade tarihi tutulmaz — vade,
    // müşterinin genel "vade günü" ayarına göre satış tarihinden türetilir.
    const vadeTarihi = musteri.vadeGunu > 0 ? new Date(new Date(s.tarih).getTime() + musteri.vadeGunu * 86400000).toLocaleDateString("en-CA") : null;
    return { satis: s, tutar: acikTutar, odenen: Math.round(buFaturayaUygulanan * 100) / 100, kalan: Math.round((acikTutar - buFaturayaUygulanan) * 100) / 100, vadeTarihi };
  });
};

export const vadeGrubuBul = (vadeTarihi) => {
  if (!vadeTarihi) return "60+ gün";
  const bugunIso = isoGun(new Date());
  const gunFarki = Math.round((new Date(vadeTarihi).getTime() - new Date(bugunIso).getTime()) / 86400000);
  if (gunFarki < 0) return "Vadesi Geçmiş";
  if (gunFarki === 0) return "Bugün";
  if (gunFarki <= 7) return "1–7 gün";
  if (gunFarki <= 30) return "8–30 gün";
  if (gunFarki <= 60) return "31–60 gün";
  return "60+ gün";
};

export const vadeRenkGorseli = (vadeTarihi) => {
  const grup = vadeGrubuBul(vadeTarihi);
  if (grup === "Vadesi Geçmiş") return { emoji: "🔴", ton: "red" };
  if (grup === "Bugün") return { emoji: "🟠", ton: "yellow" };
  if (grup === "1–7 gün") return { emoji: "🟡", ton: "yellow" };
  return { emoji: "🟢", ton: "green" };
};

// Bir müşterinin alacak özeti: Toplam Borç / Vadesi Gelen (henüz geçmemiş) /
// Vadesi Geçen / Son Ödeme tarihi.
export const musteriAlacakOzeti = (db, musteri) => {
  const faturalar = musteriAcikFaturalariFifo(db, musteri).filter((f) => f.kalan > 0.01);
  const vadesiGecen = faturalar.filter((f) => f.vadeTarihi && vadeGrubuBul(f.vadeTarihi) === "Vadesi Geçmiş").reduce((t, f) => t + f.kalan, 0);
  const vadesiGelen = faturalar.reduce((t, f) => t + f.kalan, 0) - vadesiGecen;
  const sonOdeme = musteri.hareketler.find((h) => h.tur === "ödeme");
  return { toplamBorc: musteri.bakiye || 0, vadesiGelen, vadesiGecen, sonOdemeTarihi: sonOdeme?.tarih || null, faturalar };
};

// Bir tedarikçinin borç özeti — aynı mantık, tedarikciAcikFaturalari üzerinden.
export const tedarikciBorcOzeti = (db, tedarikci) => {
  const faturalar = tedarikciAcikFaturalari(db, tedarikci.ad);
  const vadesiGecen = faturalar.filter((m) => m.vadeTarihi && vadeGrubuBul(m.vadeTarihi) === "Vadesi Geçmiş").reduce((t, m) => t + m.kalanBorc, 0);
  const vadesiGelen = faturalar.reduce((t, m) => t + m.kalanBorc, 0) - vadesiGecen;
  const sonOdeme = tedarikci.hareketler.find((h) => h.tur === "ödeme");
  return { toplamBorc: tedarikci.bakiye || 0, vadesiGelen, vadesiGecen, sonOdemeTarihi: sonOdeme?.tarih || null, faturalar };
};

// Önümüzdeki `gunSayisi` gün içinde beklenen tahsilat/ödeme toplamlarını ve
// net beklenen nakit akışını hesaplar — "Beklenen tahsilat − Beklenen ödeme".
export const nakitAkisiHesapla = (db, gunSayisi) => {
  const bugunIso = isoGun(new Date());
  const sonTarihIso = new Date(Date.now() + gunSayisi * 86400000).toLocaleDateString("en-CA");
  const beklenenTahsilat = db.cariler
    .flatMap((c) => musteriAcikFaturalariFifo(db, c))
    .filter((f) => f.kalan > 0.01 && f.vadeTarihi && f.vadeTarihi >= bugunIso && f.vadeTarihi <= sonTarihIso)
    .reduce((t, f) => t + f.kalan, 0);
  const beklenenOdeme = db.tedarikciler
    .flatMap((t) => tedarikciAcikFaturalari(db, t.ad))
    .filter((m) => m.vadeTarihi && m.vadeTarihi >= bugunIso && m.vadeTarihi <= sonTarihIso)
    .reduce((t, m) => t + m.kalanBorc, 0);
  return { beklenenTahsilat, beklenenOdeme, net: beklenenTahsilat - beklenenOdeme };
};

/* ------------------------------------------------------------------ */
/* GÜN SONU / KASA KAPANIŞ SİSTEMİ                                     */
/* ------------------------------------------------------------------ */
// Bir günün TÜM dükkân genelindeki finansal özetini tek yerde toplar —
// satış, iskonto, iade, kâr, ödeme türü kırılımı, tahsilat, gider, tedarikçi
// ödemesi. Gün Sonu ekranı VE kapatılmış bir günün raporu bunu kullanır.
export const gunSonuOzetiHesapla = (db, tarih) => {
  const satislar = db.satislar.filter((s) => s.tarih.slice(0, 10) === tarih && s.durum !== "İptal Edildi");
  const kalemler = satislar.flatMap((s) => s.kalemler);
  const brutCiro = satislar.reduce((t, s) => t + s.araToplam, 0);
  const toplamIskonto = satislar.reduce((t, s) => t + s.iskontoToplam, 0);
  const brutKar = kalemler.reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);

  const odemeToplami = (yontem) => satislar.flatMap((s) => s.odemeler).filter((o) => o.yontem === yontem).reduce((t, o) => t + o.tutar, 0);
  const nakitSatis = odemeToplami("Nakit");
  const krediKarti = odemeToplami("Kredi Kartı");
  const havaleEft = odemeToplami("Havale/EFT") + odemeToplami("Havale / EFT");
  const cariSatis = odemeToplami("Açık Hesap");

  const iadeler = db.iadeler.filter((i) => i.tarih.slice(0, 10) === tarih);
  const toplamIade = iadeler.reduce((t, i) => t + (i.toplamTutar || i.kalemler.reduce((x, k) => x + k.adet * k.birimFiyat, 0)), 0);

  const musteriTahsilat = db.cariler.flatMap((c) => c.hareketler).filter((h) => h.tur === "ödeme" && h.tarih.slice(0, 10) === tarih).reduce((t, h) => t + h.tutar, 0);
  const gider = db.giderler.filter((g) => g.odemeDurumu !== "İptal" && g.tarih === tarih).reduce((t, g) => t + g.odenenTutar, 0);
  const tedarikciOdeme = db.tedarikciler.flatMap((t) => t.hareketler).filter((h) => h.tur === "ödeme" && h.tarih.slice(0, 10) === tarih).reduce((t, h) => t + h.tutar, 0);

  return {
    toplamSatis: satislar.reduce((t, s) => t + s.genelToplam, 0),
    satisAdedi: satislar.length,
    brutCiro,
    toplamIskonto,
    toplamIade,
    brutKar,
    nakitSatis,
    krediKarti,
    havaleEft,
    cariSatis,
    musteriTahsilat,
    gider,
    tedarikciOdeme,
  };
};

// Bir tarihin GÜN SONU olarak kapatılıp kapatılmadığını söyler — kapalıysa
// o güne ait satış/gider gibi kritik işlemler normal kullanıcı tarafından
// yapılamaz (5. adım).
export const gunKapaliMi = (db, tarih) => db.gunSonlari.some((g) => g.tarih === tarih && g.durum === "Kapalı");

/* ------------------------------------------------------------------ */
/* MÜŞTERİ / TEDARİKÇİ NOT VE İLETİŞİM SİSTEMİ                         */
/* ------------------------------------------------------------------ */

// Tüm müşteri/tedarikçi notlarından, henüz tamamlanmamış ve tarihi gelmiş
// (bugün veya geçmiş) hatırlatmaları toplar — Bildirim Merkezi bunu kullanır.
export const bekleyenNotHatirlatmalari = (db) => {
  const bugunIso = isoGun(new Date());
  const musteriHatirlatmalari = db.musteriNotlari
    .filter((n) => n.hatirlatmaTarihi && !n.hatirlatmaTamamlandi && n.hatirlatmaTarihi <= bugunIso)
    .map((n) => ({ ...n, hedefAdi: db.cariler.find((c) => c.id === n.hedefId)?.ad || "—", hedefTuru: "musteri" }));
  const tedarikciHatirlatmalari = db.tedarikciNotlari
    .filter((n) => n.hatirlatmaTarihi && !n.hatirlatmaTamamlandi && n.hatirlatmaTarihi <= bugunIso)
    .map((n) => ({ ...n, hedefAdi: db.tedarikciler.find((t) => t.id === n.hedefId)?.ad || "—", hedefTuru: "tedarikci" }));
  return [...musteriHatirlatmalari, ...tedarikciHatirlatmalari];
};

// Bir satışın Açık Hesap kısmından ne kadarının hâlâ tahsil edilmediğini hesaplar.
export const satisAcikHesapKalan = (s) => {
  const acikHesapTutari = (s.odemeler || []).filter((o) => o.yontem === "Açık Hesap").reduce((t, o) => t + o.tutar, 0);
  return Math.round((acikHesapTutari - (s.acikHesapOdenen || 0)) * 100) / 100;
};

/* ------------------------------------------------------------------ */
/* ANA SAYFA / DASHBOARD                                               */
/* ------------------------------------------------------------------ */

/** Merkezi dönem kâr özeti: KDV dahil satış, iade, KDV, SMM, brüt kâr,
 * POS komisyonu ve KDV hariç faaliyet giderlerini tek standartta hesaplar. */
export const donemKarOzetiHesapla = (db, baslangic, bitis) => {
  const aktifSatislar = (db.satislar || []).filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= baslangic && s.tarih.slice(0, 10) <= bitis);
  const iadeler = (db.iadeler || []).filter((i) => i.tarih.slice(0, 10) >= baslangic && i.tarih.slice(0, 10) <= bitis);
  const satisCiroKdvDahil = aktifSatislar.reduce((t, s) => t + Number(s.genelToplam || 0), 0);
  const iadeCiroKdvDahil = iadeler.reduce((t, i) => t + Number(i.tutar || 0), 0);
  const netCiroKdvDahil = satisCiroKdvDahil - iadeCiroKdvDahil;
  const kdvSat = aktifSatislar.flatMap((s) => s.kalemler || []).reduce((t, k) => {
    const brut =
      (Number(k.birimFiyat) || 0) * (Number(k.adet) || 0) -
      (Number(k.iskontoTutari) || 0) -
      (Number(k.genelIskontoPayi) || 0);
    const net = brut / (1 + (Number(k.kdvOrani) || 0) / 100);
    return t + (brut - net);
  }, 0);
  const kdvIade = iadeler.flatMap((i) => i.kalemler || []).reduce((t, k) => {
    const brut = (Number(k.birimFiyat) || 0) * (Number(k.adet) || 0);
    const net = brut / (1 + (Number(k.kdvOrani) || 0) / 100);
    return t + (brut - net);
  }, 0);
  const netCiroKdvHaric = netCiroKdvDahil - (kdvSat - kdvIade);
  const satisSmm = aktifSatislar.flatMap((s) => s.kalemler || []).reduce((t, k) => t + (Number(k.maliyet) || 0) * (Number(k.adet) || 0), 0);
  const iadeSmm = iadeler.reduce((t, i) => {
    const satis = (db.satislar || []).find((s) => s.id === i.satisId);
    if (!satis) return t;
    return t + (i.kalemler || []).reduce((z, ik) => {
      const sk = (satis.kalemler || []).find((k) => k.parcaId === ik.parcaId);
      return z + (Number(sk?.maliyet) || 0) * (Number(ik.adet) || 0);
    }, 0);
  }, 0);
  const smm = satisSmm - iadeSmm;
  const brutKar = netCiroKdvHaric - smm;
  const posKomisyonu = (db.posTahsilatlari || []).filter((p) => p.durum !== "İptal" && (p.tarih || "").slice(0, 10) >= baslangic && (p.tarih || "").slice(0, 10) <= bitis).reduce((t, p) => t + (Number(p.komisyonTutari) || 0), 0);
  const giderler = (db.giderler || []).filter((g) => g.odemeDurumu !== "İptal" && g.tarih >= baslangic && g.tarih <= bitis);
  const faaliyetGideriKdvHaric = giderler.reduce((t, g) => t + Number(g.kdvHaricTutar ?? g.tutar ?? 0), 0);
  const netFaaliyetKari = brutKar - posKomisyonu - faaliyetGideriKdvHaric;
  return { satisCiroKdvDahil, iadeCiroKdvDahil, netCiroKdvDahil, kdv: kdvSat - kdvIade, netCiroKdvHaric, smm, brutKar, posKomisyonu, faaliyetGideriKdvHaric, netFaaliyetKari };
};

export const TARIH_ARALIGI_HESAPLA = (secim, ozelBaslangic, ozelBitis) => {
  const bugunTarih = new Date();
  const bugunIso = isoGun(bugunTarih);
  if (secim === "dun") {
    const d = isoGun(new Date(Date.now() - 86400000));
    return [d, d];
  }
  if (secim === "hafta") return [isoGun(new Date(Date.now() - 6 * 86400000)), bugunIso];
  if (secim === "ay") return [new Date(bugunTarih.getFullYear(), bugunTarih.getMonth(), 1).toLocaleDateString("en-CA"), bugunIso];
  if (secim === "gecenAy") {
    const ilkGun = new Date(bugunTarih.getFullYear(), bugunTarih.getMonth() - 1, 1).toLocaleDateString("en-CA");
    const sonGun = new Date(bugunTarih.getFullYear(), bugunTarih.getMonth(), 0).toLocaleDateString("en-CA");
    return [ilkGun, sonGun];
  }
  if (secim === "ozel") return [ozelBaslangic || bugunIso, ozelBitis || bugunIso];
  return [bugunIso, bugunIso]; // "bugun"
};

/* ------------------------------------------------------------------ */
/* GÜN SONU / KASA KAPANIŞ SAYFASI                                     */
/* ------------------------------------------------------------------ */
// Bir hesabın (kasanın) şu an açık bir vardiya tarafından kullanılıp
// kullanılmadığını bulur — "Kasa 1 → Emirhan, Kasa 2 → Personel B" gibi
// personel bazlı kasa ayrımını (48. adım, 5. madde) mümkün kılar.
export const hesabinAktifVardiyasi = (db, hesapId) => db.vardiyalar.find((v) => v.hesapId === hesapId && v.durum === "Açık");

// Bir vardiyanın açılışından (kapanışına ya da şu ana kadar) o PERSONELİN
// yaptığı satış/tahsilat/iade/gider toplamlarını otomatik hesaplar (48.
// adım, 2. ve 3. madde) — vardiya ekranı ve personel performans raporu
// bunu kullanır.
export const vardiyaOzetiHesapla = (db, vardiya) => {
  const baslangic = vardiya.acilisZamani;
  const bitis = vardiya.kapanisZamani || zamanDamgasi();
  const satislar = db.satislar.filter((s) => s.satisiYapan === vardiya.kullaniciAdi && s.durum !== "İptal Edildi" && s.tarih >= baslangic && s.tarih <= bitis);
  const toplamSatis = satislar.reduce((t, s) => t + s.genelToplam, 0);
  const odemeToplami = (yontem) => satislar.flatMap((s) => s.odemeler).filter((o) => o.yontem === yontem).reduce((t, o) => t + o.tutar, 0);
  const nakitSatis = odemeToplami("Nakit");
  const kartSatis = odemeToplami("Kredi Kartı");
  const havale = odemeToplami("Havale/EFT") + odemeToplami("Havale / EFT");
  const cariSatis = odemeToplami("Açık Hesap");
  const iskonto = satislar.reduce((t, s) => t + s.iskontoToplam, 0);
  const kalemler = satislar.flatMap((s) => s.kalemler);
  const brutKar = kalemler.reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);
  const tahsilat = db.kasaIslemleri
    .filter((k) => k.yon === "tahsilat" && k.durum !== "İptal Edildi" && k.islemiYapan === vardiya.kullaniciAdi && k.tarih >= baslangic && k.tarih <= bitis)
    .reduce((t, k) => t + k.tutar, 0);
  const iade = db.iadeler.filter((i) => i.iadeyiAlan === vardiya.kullaniciAdi && i.tarih >= baslangic && i.tarih <= bitis).reduce((t, i) => t + i.tutar, 0);
  const hesap = db.hesaplar.find((h) => h.id === vardiya.hesapId);
  const kasaHareketleriBuVardiyada = hesap ? hesap.hareketler.filter((h) => h.tarih >= baslangic && h.tarih <= bitis && h.kullanici === vardiya.kullaniciAdi) : [];
  const kasaGideri = kasaHareketleriBuVardiyada.filter((h) => h.tur.includes("Gider")).reduce((t, h) => t + h.cikis, 0);
  const kasaCikisi = kasaHareketleriBuVardiyada.filter((h) => h.cikis > 0 && !h.tur.includes("Gider")).reduce((t, h) => t + h.cikis, 0);
  const acilisNakit = vardiya.acilisKasaTutari || 0;
  const beklenenNakit = Math.round((acilisNakit + nakitSatis + tahsilat - kasaGideri - kasaCikisi - iade) * 100) / 100;
  return { toplamSatis, satisAdedi: satislar.length, nakitSatis, kartSatis, havale, cariSatis, tahsilat, iade, iskonto, brutKar, kasaGideri, kasaCikisi, beklenenNakit };
};

/* ------------------------------------------------------------------ */
/* ANA RAPOR MERKEZİ / YÖNETİCİ KONTROL PANELİ                        */
/* ------------------------------------------------------------------ */
// Bu panel, programdaki TÜM alt sistemlerin (finans, stok, satış, kârlılık,
// satın alma, cari, personel, alarm) özetini tek ekranda birleştirir.
// Mevcut merkezi hesaplama motorlarını (46, 45, 47, 56, 57, 48, 37. adımlar)
// YENİDEN KULLANIR — aynı rakamların farklı ekranlarda farklı çıkmasını önler.
export const yoneticiPaneliDonemAraligi = (donemId) => {
  const bugun = new Date();
  const bugunIso = isoGun(bugun);
  if (donemId === "ay") return [isoGun(new Date(bugun.getFullYear(), bugun.getMonth(), 1)), bugunIso];
  if (donemId === "hafta") return [isoGun(new Date(Date.now() - 6 * 86400000)), bugunIso];
  if (donemId === "yil") return [isoGun(new Date(bugun.getFullYear(), 0, 1)), bugunIso];
  return [bugunIso, bugunIso];
};

// İki dönemi karşılaştırıp % değişim döner (10. madde).
export const donemKarsilastir = (db, b1, s1, b2, s2) => {
  const satislar1 = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= b1 && s.tarih.slice(0, 10) <= s1);
  const satislar2 = db.satislar.filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= b2 && s.tarih.slice(0, 10) <= s2);
  const ciro1 = satislar1.reduce((t, s) => t + s.genelToplam, 0);
  const ciro2 = satislar2.reduce((t, s) => t + s.genelToplam, 0);
  const kar1 = satislar1.flatMap((s) => s.kalemler).reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);
  const kar2 = satislar2.flatMap((s) => s.kalemler).reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);
  const sepet1 = satislar1.length > 0 ? ciro1 / satislar1.length : 0;
  const sepet2 = satislar2.length > 0 ? ciro2 / satislar2.length : 0;
  return {
    ciro: { g1: ciro1, g2: ciro2, yuzde: fiyatDegisimYuzdesi(ciro2, ciro1) },
    satisAdedi: { g1: satislar1.length, g2: satislar2.length, yuzde: fiyatDegisimYuzdesi(satislar2.length, satislar1.length) },
    brutKar: { g1: kar1, g2: kar2, yuzde: fiyatDegisimYuzdesi(kar2, kar1) },
    ortalamaSepet: { g1: sepet1, g2: sepet2, yuzde: fiyatDegisimYuzdesi(sepet2, sepet1) },
  };
};
