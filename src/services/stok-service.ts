/* Stok, satın alma ve ürün analiz servisleri */
import { isoGun } from "../lib/format";
import { ean13KontrolHanesi, parcaTumBarkodlari } from "../lib/barkod";
import { gecerliMaliyet, kdvHaricSatisFiyati, satisKalemiKarBilgisi } from "../lib/maliyet";
import { sonNGunSatisAdedi, satisHiziSiniflandir, stokYasiGunu } from "../lib/olu-stok";
import { parcaRezerveAdedi, parcaKarsilanmisMusteriSiparisiAdedi, parcaBekleyenMusteriTalebi, parcaSatilabilirStok } from "../lib/rezerv";
import { siparisAlinanAdet, siparisToplamAdet } from "../core/satin-alma";

// Hedef stok tanımlı değilse, minimum stoğun iki katını makul bir varsayılan
// hedef olarak kullanır — böylece hiç ayar yapılmamış ürünlerde bile öneri
// sistemi anlamlı bir sayı üretir.
export const gecerliHedefStok = (p) => (p.hedefStok > 0 ? p.hedefStok : (p.kritikSeviye || 0) * 2);

export const onerilenSiparisAdedi = (p) => Math.max(0, Math.round(gecerliHedefStok(p) - (p.stok || 0) - (p.siparisteAdet || 0)));

/* ------------------------------------------------------------------ */
/* OTOMATİK SATIN ALMA / STOK SİPARİŞ ÖNERİ MOTORU                     */
/* ------------------------------------------------------------------ */
// Bir ürünün, henüz gelmemiş (Sipariş Verildi / Kısmi Geldi durumundaki)
// satın alma siparişlerindeki bekleyen adedini toplar.
export const parcaAcikSatinAlmaAdedi = (db, parcaId) =>
  db.satinAlmaSiparisleri
    .filter((s) => s.durum === "Sipariş Verildi" || s.durum === "Kısmi Geldi")
    .flatMap((s) => s.kalemler)
    .filter((k) => k.parcaId === parcaId)
    .reduce((t, k) => t + Math.max(0, (k.adet || 0) - (k.alinanAdet || 0)), 0);

// TÜM sistemi (stok, satış hızı, rezerv, müşteri siparişi, tedarikçi
// karşılaştırma, ölü stok) birleştiren merkezi sipariş öneri motoru (59.
// adım). Basit onerilenSiparisAdedi()'nin YERİNİ ALMAZ — o hâlâ hafif
// yerlerde (örn. tekliften sipariş aktarma) kullanılabilir; bu fonksiyon
// ise TAM karar destek ekranı (SiparisOnerisiSayfasi) için kullanılır.
export const akilliSiparisOnerisiHesapla = (db, parca) => {
  const sinif = satisHiziSiniflandir(db, parca);
  const son30 = sonNGunSatisAdedi(db, parca.id, 30);
  const son60 = sonNGunSatisAdedi(db, parca.id, 60);
  const son90 = sonNGunSatisAdedi(db, parca.id, 90);
  const ortalamaGunluk = son30 / 30;

  const rezerveAdet = parcaRezerveAdedi(db, parca.id);
  const karsilananMusteriSiparisi = parcaKarsilanmisMusteriSiparisiAdedi(db, parca.id);
  const satilabilirStok = Math.max(0, (parca.stok || 0) - rezerveAdet - karsilananMusteriSiparisi);
  const bekleyenMusteriTalebi = parcaBekleyenMusteriTalebi(db, parca.id);
  const acikSAAdedi = parcaAcikSatinAlmaAdedi(db, parca.id);
  const siparisteAdet = Math.max(parca.siparisteAdet || 0, acikSAAdedi);

  const hedef = gecerliHedefStok(parca);
  const guvenlikStogu = parca.guvenlikStogu || 0;
  const enUygunTedarikci = enUygunTedarikciBul(db, parca.id);
  const tedarikSuresiGun = parca.tedarikci ? tedarikciTeslimatPerformansi(db, parca.tedarikci)?.ortalamaTeslimatGun ?? null : null;
  const tahminiGun = ortalamaGunluk > 0 ? Math.round((parca.stok / ortalamaGunluk) * 10) / 10 : null;

  // Ölü stok kontrolü (7. madde) — "Ölü Stok" sınıfındaki ürüne, stok zaten
  // varsa yeni sipariş ÖNERİLMEZ (dükkânda gereksiz duran ürünü büyütmemek için).
  if (sinif === "Ölü Stok" && (parca.stok || 0) > 0) {
    return {
      parca, sinif, son30, son60, son90, ortalamaGunluk, tahminiGun,
      satilabilirStok, rezerveAdet, siparisteAdet, bekleyenMusteriTalebi,
      onerilenAdet: 0, engellendiNeden: "oluStok", enUygunTedarikci, tedarikSuresiGun,
    };
  }

  // Toplam ihtiyaç = (Hedef Stok VE Güvenlik Stoğundan büyük olanı) +
  // bekleyen müşteri siparişi (6. madde). Mevcut karşılanabilir = satılabilir
  // stok + zaten yolda olan (siparişteki) miktar.
  const toplamIhtiyac = Math.max(hedef, guvenlikStogu) + bekleyenMusteriTalebi;
  const mevcutKarsilanabilir = satilabilirStok + siparisteAdet;
  let onerilenAdet = Math.max(0, Math.round(toplamIhtiyac - mevcutKarsilanabilir));

  // Tedarikçinin minimum sipariş adedi varsa ve öneri bunun altındaysa,
  // minimuma yuvarlanır (1. madde).
  let minSiparisUygulandi = false;
  if (onerilenAdet > 0 && enUygunTedarikci) {
    const tedarikciKaydi = db.tedarikciler.find((t) => t.ad === enUygunTedarikci.tedarikciAdi);
    if (tedarikciKaydi?.minimumSiparisAdedi > onerilenAdet) {
      onerilenAdet = tedarikciKaydi.minimumSiparisAdedi;
      minSiparisUygulandi = true;
    }
  }

  // Acil durum (3. madde) — hızlı satan bir üründe, stok bitene kadar kalan
  // süre, tedarikçinin ortalama teslim süresinden KISAYSA acil sipariş gerekir.
  const acilMi = tahminiGun !== null && tedarikSuresiGun !== null && tahminiGun <= tedarikSuresiGun;

  return {
    parca, sinif, son30, son60, son90, ortalamaGunluk, tahminiGun,
    satilabilirStok, rezerveAdet, siparisteAdet, bekleyenMusteriTalebi,
    onerilenAdet, engellendiNeden: null, enUygunTedarikci, tedarikSuresiGun,
    minSiparisUygulandi, acilMi, hedef, guvenlikStogu,
  };
};

/* SATIN ALMA SİPARİŞİ SİSTEMİ — paylaşılan yardımcı fonksiyonlar      */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
// Bir ürünün belirli bir depodaki stoğu.
export const depoStogu = (p, depoId) => (p.depoStoklari || []).find((d) => d.depoId === depoId)?.adet || 0;

// Bir ürünün şu an "yolda" (gönderildi ama henüz teslim alınmadı) toplam
// adedi — kaynak depodan düşülmüş, hedef depoya henüz eklenmemiş miktardır.
export const parcaAcikTransferAdedi = (db, parcaId) =>
  db.transferler.filter((t) => t.parcaId === parcaId && (t.durum === "Gönderildi" || t.durum === "Yolda")).reduce((t, x) => t + x.adet, 0);

// Bir tedarikçinin geçmiş siparişlerinden teslimat performansını çıkarır:
// ortalama teslimat süresi (gün), zamanında teslim oranı, eksik teslim oranı.
export const tedarikciTeslimatPerformansi = (db, tedarikciAdi) => {
  const siparisler = db.satinAlmaSiparisleri.filter((s) => s.tedarikci === tedarikciAdi && s.durum !== "Taslak" && s.durum !== "İptal");
  if (siparisler.length === 0) return null;
  let teslimatGunToplami = 0;
  let teslimatSayisi = 0;
  let zamanindaSayisi = 0;
  let eksikSayisi = 0;
  siparisler.forEach((s) => {
    if (s.malKabulGecmisi.length > 0) {
      const ilkKabul = s.malKabulGecmisi[s.malKabulGecmisi.length - 1]; // en eski kayıt sonda
      const gun = Math.round((new Date(ilkKabul.tarih).getTime() - new Date(s.siparisTarihi).getTime()) / 86400000);
      teslimatGunToplami += gun;
      teslimatSayisi++;
      const sonKabul = s.malKabulGecmisi[0];
      if (s.beklenenTeslimTarihi && sonKabul.tarih.slice(0, 10) <= s.beklenenTeslimTarihi) zamanindaSayisi++;
    }
    if (s.durum === "Kısmi Geldi" || (s.durum === "Tamamlandı" && siparisAlinanAdet(s) < siparisToplamAdet(s))) eksikSayisi++;
  });
  // Ortalama fiyat — bu tedarikçiden alınan tüm mal alım kalemlerinin
  // ağırlıklı ortalama birim fiyatı (10. adım).
  const alisKalemleri = db.malAlimlari.filter((m) => m.tedarikci === tedarikciAdi).flatMap((m) => m.kalemler);
  const toplamAdet = alisKalemleri.reduce((t, k) => t + k.adet, 0);
  const ortalamaFiyat = toplamAdet > 0 ? alisKalemleri.reduce((t, k) => t + k.adet * k.birimFiyat, 0) / toplamAdet : null;
  // İade oranı — bu tedarikçiye yapılan alışlardan kaç tanesi sonradan iade
  // edilmiş (adet bazında).
  const iadeAdedi = db.alisIadeleri.filter((i) => i.tedarikci === tedarikciAdi).reduce((t, i) => t + i.kalemler.reduce((x, k) => x + k.adet, 0), 0);
  const iadeOrani = toplamAdet > 0 ? Math.round((iadeAdedi / toplamAdet) * 1000) / 10 : 0;
  return {
    ortalamaTeslimatGun: teslimatSayisi > 0 ? Math.round((teslimatGunToplami / teslimatSayisi) * 10) / 10 : null,
    zamanindaYuzde: teslimatSayisi > 0 ? Math.round((zamanindaSayisi / teslimatSayisi) * 100) : null,
    eksikYuzde: Math.round((eksikSayisi / siparisler.length) * 100),
    toplamSiparis: siparisler.length,
    ortalamaFiyat,
    iadeOrani,
  };
};

/* ------------------------------------------------------------------ */
/* TEDARİKÇİ FİYAT KARŞILAŞTIRMA SİSTEMİ                               */
/* ------------------------------------------------------------------ */
export const TEDARIKCI_STOK_DURUMLARI = ["Stokta", "Az Stok", "Stok Yok"];

export const tedarikciStokDurumGorseli = { Stokta: "🟢", "Az Stok": "🟡", "Stok Yok": "🔴" };

// Teklifin GERÇEK net maliyetini hesaplar — sadece birim fiyat değil, iskonto
// + KDV + kargo/nakliye/diğer maliyetler (adet başına dağıtılmış) dahil (2. madde).
export const teklifNetMaliyetHesapla = (teklif) => {
  const iskontoluFiyat = teklif.birimFiyat * (1 - (teklif.iskontoYuzde || 0) / 100);
  const kdvli = iskontoluFiyat * (1 + (teklif.kdvOrani || 0) / 100);
  const ekMaliyetBirimBasi = ((teklif.kargoUcreti || 0) + (teklif.nakliyeUcreti || 0) + (teklif.digerMaliyet || 0)) / (teklif.adet || 1);
  return Math.round((kdvli + ekMaliyetBirimBasi) * 100) / 100;
};

// Geçerlilik tarihi geçmiş tedarikçi tekliflerini otomatik "Süresi Doldu"
// yapar (8. madde).
export const tedarikciTeklifSureleriGuncelle = (db) => {
  const bugunIso = isoGun(new Date());
  const guncellenecek = db.tedarikciTeklifleri.filter((t) => t.durum === "Geçerli" && t.gecerlilikTarihi && t.gecerlilikTarihi < bugunIso);
  if (guncellenecek.length === 0) return db;
  return { ...db, tedarikciTeklifleri: db.tedarikciTeklifleri.map((t) => (guncellenecek.some((g) => g.id === t.id) ? { ...t, durum: "Süresi Doldu" } : t)) };
};

// Bir ürünün alış geçmişinden Son Alış / En Düşük / En Yüksek / Ortalama /
// Son 3-5-10 Alış / Tedarikçiye göre kırılım istatistiklerini çıkarır (2. madde).
export const urunAlisIstatistikleri = (db, parcaId) => {
  const parca = db.parcalar.find((p) => p.id === parcaId);
  const gecmis = [...(parca?.alisGecmisi || [])].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  if (gecmis.length === 0) return null;
  const enDusuk = [...gecmis].sort((a, b) => a.birimFiyat - b.birimFiyat)[0];
  const enYuksek = [...gecmis].sort((a, b) => b.birimFiyat - a.birimFiyat)[0];
  const ortalama = gecmis.reduce((t, g) => t + g.birimFiyat, 0) / gecmis.length;
  const sonNOrtalama = (n) => {
    const dilim = gecmis.slice(0, n);
    return dilim.reduce((t, g) => t + g.birimFiyat, 0) / dilim.length;
  };
  const tedarikciBazinda = (() => {
    const harita: Record<string, number[]> = {};
    gecmis.filter((g) => g.tedarikci).forEach((g) => {
      if (!harita[g.tedarikci]) harita[g.tedarikci] = [];
      harita[g.tedarikci].push(g.birimFiyat);
    });
    return Object.entries(harita).map(([tedarikci, fiyatlar]) => ({ tedarikci, ortalama: fiyatlar.reduce((t, f) => t + f, 0) / fiyatlar.length, sonFiyat: fiyatlar[0], adet: fiyatlar.length }));
  })();
  return {
    sonAlis: gecmis[0],
    enDusuk,
    enYuksek,
    ortalama,
    son3Ortalama: sonNOrtalama(3),
    son5Ortalama: sonNOrtalama(5),
    son10Ortalama: sonNOrtalama(10),
    tedarikciBazinda,
    tumGecmis: gecmis,
  };
};

// Bir ürünün SATIŞ fiyat geçmişinden (fiyatGecmisi kaydı, HER değişiklik
// değil, o değişiklik anındaki fiyat) benzer istatistikleri çıkarır (3. madde).
// Ayrıca gerçek satış KALEMLERİNDEN (satılan fiyat, sepet iskontosu dahil)
// bir ikinci veri kümesi de sunar — daha doğru "gerçekte kaça sattım" bilgisi.
export const urunSatisIstatistikleri = (db, parcaId) => {
  const satisKalemleri = db.satislar
    .filter((s) => s.durum !== "İptal Edildi")
    .flatMap((s) => s.kalemler.map((k) => ({ ...k, satisTarihi: s.tarih })))
    .filter((k) => k.parcaId === parcaId)
    .sort((a, b) => new Date(b.satisTarihi).getTime() - new Date(a.satisTarihi).getTime());
  if (satisKalemleri.length === 0) return null;
  const fiyatlar = satisKalemleri.map((k) => k.birimFiyat);
  const enDusukKalem = satisKalemleri.reduce((min, k) => (k.birimFiyat < min.birimFiyat ? k : min));
  const enYuksekKalem = satisKalemleri.reduce((max, k) => (k.birimFiyat > max.birimFiyat ? k : max));
  const ortalama = fiyatlar.reduce((t, f) => t + f, 0) / fiyatlar.length;
  const sonNOrtalama = (n) => {
    const dilim = fiyatlar.slice(0, n);
    return dilim.reduce((t, f) => t + f, 0) / dilim.length;
  };
  return {
    sonSatis: satisKalemleri[0],
    enDusuk: enDusukKalem,
    enYuksek: enYuksekKalem,
    ortalama,
    son3Ortalama: sonNOrtalama(3),
    son5Ortalama: sonNOrtalama(5),
    son10Ortalama: sonNOrtalama(10),
    tumGecmis: satisKalemleri,
  };
};

// Fiyat değişikliği nedeni — seçilebilir sabit liste (8. madde).
export const FIYAT_DEGISIM_NEDENLERI = ["Tedarikçi Zam Yaptı", "Kampanya", "Maliyet Düştü", "Piyasa Fiyatı Değişti", "Manuel Düzeltme", "Diğer"];

// İki fiyat arasındaki değişim yüzdesini hesaplar (4. madde).
export const fiyatDegisimYuzdesi = (eski, yeni) => (eski > 0 ? Math.round(((yeni - eski) / eski) * 1000) / 10 : null);

// Bir ürün için TÜM tedarikçileri (geçerli tekliflerden + geçmiş
// alışlardan) tek listede, en düşük gerçek maliyete göre sıralı toplar (1.
// ve 5. madde) — "Program en düşük gerçek maliyeti otomatik işaretlesin."
export const urunTedarikciKarsilastirmasi = (db, parcaId) => {
  const parca = db.parcalar.find((p) => p.id === parcaId);
  if (!parca) return [];
  const teklifler = db.tedarikciTeklifleri.filter((t) => t.parcaId === parcaId && t.durum === "Geçerli");
  const tedarikciAdlari = new Set(teklifler.map((t) => t.tedarikciAdi));
  (parca.alisGecmisi || []).forEach((g) => g.tedarikci && tedarikciAdlari.add(g.tedarikci));
  return [...tedarikciAdlari]
    .map((ad) => {
      const enSonTeklif = teklifler.filter((t) => t.tedarikciAdi === ad).sort((a, b) => new Date(b.teklifTarihi).getTime() - new Date(a.teklifTarihi).getTime())[0] || null;
      const sonAlislar = (parca.alisGecmisi || []).filter((g) => g.tedarikci === ad).sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      const sonAlisFiyati = sonAlislar[0]?.birimFiyat ?? null;
      const netMaliyet = enSonTeklif ? teklifNetMaliyetHesapla(enSonTeklif) : sonAlisFiyati;
      return { tedarikciAdi: ad, sonAlisFiyati, teklif: enSonTeklif, netMaliyet };
    })
    .filter((s) => s.netMaliyet !== null)
    .sort((a, b) => a.netMaliyet - b.netMaliyet);
};

// Sipariş önerisi ekranı için: "En uygun tedarikçi: ABC" (5. madde).
export const enUygunTedarikciBul = (db, parcaId) => {
  const k = urunTedarikciKarsilastirmasi(db, parcaId);
  return k.length > 0 ? k[0] : null;
};

// kodNormalize / parcaTumBarkodlari / parcaBarkodEslesiyorMu / barkodluParcaBul
// artık ./lib/barkod içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* VERİ DOĞRULAMA VE MÜKERRER ÜRÜN KONTROLÜ                            */
/* ------------------------------------------------------------------ */
// metinBenzerligiYuzde / mukerrerUrunBul / benzerUrunleriBul artık ./lib/veri-dogrulama içinden import ediliyor.

// EAN-13 kontrol hanesi: soldan sağa 1., 3., 5.… haneler ×1, 2., 4., 6.…
// haneler ×3 ağırlıklandırılıp toplanır; kontrol hanesi toplamı 10'a
// tamamlayan sayıdır.
// ean13KontrolHanesi / EAN_L / EAN_G / EAN_R / EAN_PARITE / ean13Modulleri
// artık ./lib/barkod içinden import ediliyor.

// Barkodu olmayan ürünler için dahili (mağaza içi) EAN-13 üretir — "20" ile
// başlayan öneki, gerçek üretici barkodlarıyla çakışmasın diye GS1'in
// "kısıtlı dağıtım / iç kullanım" için ayırdığı 20-29 aralığından seçildi.
export const otomatikBarkodUret = (db) => {
  const kullanilanlar = new Set(db.parcalar.flatMap((p) => parcaTumBarkodlari(p)));
  let sira = db.parcalar.length + 1;
  let aday;
  let deneme = 0;
  do {
    const govde = "20" + String(sira + deneme).padStart(10, "0");
    aday = govde + ean13KontrolHanesi(govde);
    deneme++;
  } while (kullanilanlar.has(aday) && deneme < 100000);
  return aday;
};

/* ------------------------------------------------------------------ */
/* MALİYET MANTIĞI                                                     */
/* ------------------------------------------------------------------ */
// Bir parçaya yeni stok girişi işlendiğinde, mevcut stok ile mevcut ortalama
// maliyeti, yeni gelen adet/fiyatla ağırlıklı olarak birleştirir. Bu yöntem
// (ağırlıklı ortalama maliyet / moving average cost) sayesinde aynı parça
// farklı tarihlerde farklı fiyatlardan alınsa bile, o an elde bulunan stoğun
// gerçek maliyeti — dolayısıyla satıştaki gerçek kâr — her zaman doğru hesaplanır.
// Örnek: elde 10 adet @ 500₺ (ortalama maliyet 500₺) varken 10 adet daha
// 600₺'den alınırsa: yeni ortalama = (10×500 + 10×600) / 20 = 550₺.
// agirlikliOrtalamaMaliyetHesapla / gecerliMaliyet artık ./lib/maliyet içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* ÜRÜN BİRİMLERİ VE PAKET / SET YÖNETİMİ                              */
/* ------------------------------------------------------------------ */
// Bir Set ürünün bileşen listesini, her bileşenin gerçek ürün kaydıyla
// birlikte döner (silinmiş bir bileşen varsa listeden düşer).
export const setBilesenDetaylari = (db, parca) => (parca.setBilesenleri || []).map((b) => ({ ...b, parca: db.parcalar.find((p) => p.id === b.parcaId) })).filter((b) => b.parca);

// Bir Set ürünün TOPLAM parça maliyeti — kendi stoğu olmadığından maliyeti
// her zaman bileşenlerinden anlık olarak hesaplanır.
export const setMaliyetiHesapla = (db, parca) => setBilesenDetaylari(db, parca).reduce((t, b) => t + gecerliMaliyet(b.parca) * b.adet, 0);

// Bir Set'ten "adet" kadar satılabilir mi? — tüm bileşenlerin satılabilir
// stoğu yeterli olmalı (rezerv sistemiyle uyumlu, ham stok değil).
export const setSatilabilirMi = (db, parca, adet) => setBilesenDetaylari(db, parca).every((b) => parcaSatilabilirStok(db, b.parca) >= b.adet * adet);

// Perakende Satış Fiyatı KDV DAHİL girilir, maliyet (ortalama/son alış) ise
// KDV HARİÇ tutulur. Kârı doğru hesaplayabilmek için ikisini aynı zemine
// (KDV hariç) çekmek gerekir — aksi halde "elma ile armut" kıyaslanmış olur.
// kdvHaricSatisFiyati / kdvDahilMaliyet / karTutariHesapla artık ./lib/maliyet içinden import ediliyor.

// İki farklı, birbirine karıştırılmaması gereken oran:
// - "Maliyete göre kâr oranı" (markup): kâr, MALİYETE bölünür. 1000 maliyetli
//   ürünü 1300'e satarsan: 300/1000 = %30.
// - "Satış üzerinden kâr marjı" (margin): kâr, SATIŞ FİYATINA bölünür.
//   Aynı örnekte: 300/1300 = %23,08. İkisi asla birbirine eşit değildir.
// karOraniMarkup / karOraniMargin artık ./lib/maliyet içinden import ediliyor.

// Hedef kâr oranından (markup ya da margin) tavsiye edilen KDV DAHİL satış
// fiyatını hesaplar.
export const tavsiyeFiyatHesapla = (maliyet, kdvOrani, hedefTur, hedefDeger) => {
  if (!maliyet || maliyet <= 0) return 0;
  const oran = parseFloat(hedefDeger) || 0;
  const net = hedefTur === "margin" ? maliyet / (1 - oran / 100) : maliyet * (1 + oran / 100);
  if (!isFinite(net) || net < 0) return 0;
  return net * (1 + (kdvOrani || 0) / 100);
};

// Toplu fiyat güncellemede kullanılan yuvarlama — mağaza zarar etmesin diye
// her zaman YUKARI yuvarlanır (427,36₺ → 10'a yuvarlamada 430₺ olur, asla 420₺ değil).
// birim=0 → yuvarlama uygulanmaz.
export const fiyatYuvarla = (fiyat, birim) => (birim > 0 ? Math.ceil(fiyat / birim) * birim : Math.round(fiyat * 100) / 100);

/* ------------------------------------------------------------------ */
/* 61. ADIM — GELİŞMİŞ STOK YÖNETİMİ VE STOK ANALİZ MERKEZİ            */
/* ------------------------------------------------------------------ */
// Bir ürün için tüm zamanlar (iptal hariç) toplam satış adedi — "hiç satış
// geçmişi var mı" sorusuna hızlı cevap vermek için (Stoksuz ürün önceliği).
export const parcaTumZamanlarSatisAdedi = (db, parcaId) =>
  db.satislar
    .filter((s) => s.durum !== "İptal Edildi")
    .flatMap((s) => s.kalemler)
    .filter((k) => k.parcaId === parcaId)
    .reduce((t, k) => t + k.adet, 0);

// Marka/kategori/depo analizleri için tek bir ürün satırının tüm metriklerini
// bir arada üreten merkezi fonksiyon — Stok Analiz Merkezi'ndeki tüm alt
// sekmeler aynı hesaplamayı (tek doğruluk kaynağı) kullanır.
export const stokAnalizSatiriHesapla = (db, p) => {
  const maliyet = gecerliMaliyet(p, db);
  const rezerveAdet = parcaRezerveAdedi(db, p.id) + parcaKarsilanmisMusteriSiparisiAdedi(db, p.id);
  const satilabilir = parcaSatilabilirStok(db, p);
  const yoldaki = parcaAcikSatinAlmaAdedi(db, p.id);
  const min = p.kritikSeviye || 0;
  const max = gecerliHedefStok(p);
  const sinif = satisHiziSiniflandir(db, p);
  const stokYasi = stokYasiGunu(db, p.id);
  const stokMaliyeti = Math.round((p.stok || 0) * maliyet * 100) / 100;
  const tahminiSatisDegeri = Math.round((p.stok || 0) * kdvHaricSatisFiyati(p) * 100) / 100;
  return {
    p, maliyet, rezerveAdet, satilabilir, yoldaki, min, max, sinif, stokYasi,
    stokMaliyeti, tahminiSatisDegeri,
    hasarli: p.hasarliStok || 0,
    son30: sonNGunSatisAdedi(db, p.id, 30),
    kritikMi: (p.stok || 0) > 0 && p.stok <= min,
    stoksuzMu: (p.stok || 0) === 0,
    satisGecmisiVarMi: parcaTumZamanlarSatisAdedi(db, p.id) > 0,
  };
};

// Marka ya da kategoriye göre (alan adı parametreyle verilir) stok
// değeri / satış / kâr / devir hızı özetleyen genel amaçlı gruplama.
export const markaKategoriAnaliziYap = (db, satirlar, alan) => {
  const bugunIso = isoGun(new Date());
  const yilOncesiIso = isoGun(new Date(Date.now() - 365 * 86400000));
  const son365Kalemler = db.satislar
    .filter((s) => s.durum !== "İptal Edildi" && s.tarih.slice(0, 10) >= yilOncesiIso && s.tarih.slice(0, 10) <= bugunIso)
    .flatMap((s) => s.kalemler);

  const gruplar: Record<string, any> = {};
  satirlar.forEach((x) => {
    const deger = alan === "marka" ? x.p.marka || "Markasız" : x.p.kategori || "Kategorisiz";
    if (!gruplar[deger]) gruplar[deger] = { ad: deger, stokMaliyeti: 0, urunSayisi: 0, oluStokSayisi: 0, satisTutari: 0, karToplam: 0 };
    gruplar[deger].stokMaliyeti += x.stokMaliyeti;
    gruplar[deger].urunSayisi += 1;
    if (x.sinif === "Ölü Stok" && (x.p.stok || 0) > 0) gruplar[deger].oluStokSayisi += 1;
  });
  son365Kalemler.forEach((k) => {
    const parca = db.parcalar.find((p) => p.id === k.parcaId);
    if (!parca) return;
    const deger = alan === "marka" ? parca.marka || "Markasız" : parca.kategori || "Kategorisiz";
    if (!gruplar[deger]) return;
    const kb = satisKalemiKarBilgisi(k);
    const net = k.birimFiyat / (1 + (k.kdvOrani || 0) / 100);
    gruplar[deger].satisTutari += net * k.adet - (k.iskontoTutari || 0);
    gruplar[deger].karToplam += kb.karToplam;
  });

  return Object.values(gruplar)
    .map((g) => ({
      ...g,
      devir: g.stokMaliyeti > 0 ? Math.round((g.satisTutari / g.stokMaliyeti) * 100) / 100 : null,
    }))
    .sort((a, b) => b.stokMaliyeti - a.stokMaliyeti);
};
