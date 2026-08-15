import { isoGun } from "./format";
import { gecerliMaliyet, satisKalemiKarBilgisi } from "./maliyet";
import { sonNGunSatisAdedi } from "./olu-stok";

// Bir iskonto kuralını bir taban fiyata uygular — 54. adımda "Sabit Fiyat"
// ve miktar bazlı ("Kademeli %" / "X Al Y Öde") türler de eklendi.
// adet parametresi verilmezse (1 varsayılan) miktar bazlı türler normal
// fiyata düşer — sepetteki gerçek adet bilinmeden doğru hesaplanamazlar.
export const iskontoUygula = (taban, tur, deger, adet = 1, kural = null) => {
  if (tur === "sabitFiyat") return Math.max(0, deger || 0);
  if (tur === "kademeliYuzde") {
    const esikAdet = kural?.minimumAdet || 1;
    return adet >= esikAdet ? Math.max(0, taban * (1 - (deger || 0) / 100)) : taban;
  }
  if (tur === "xAlYOde") {
    // "3 Al 2 Öde" gibi — X = minimumAdet, Y = iskontoDeger (ödenecek adet).
    // Basitleştirilmiş model: eşik sağlandığında TÜM adetler (Y/X) oranına
    // göre indirimli sayılır (gerçek POS sistemlerindeki "grup bazlı" değil,
    // ortalama efektif indirim mantığıdır — sepette şeffaf gösterilir).
    const x = kural?.minimumAdet || 1;
    const y = deger || x;
    if (adet < x) return taban;
    return Math.max(0, taban * (y / x));
  }
  return Math.max(0, tur === "yuzde" ? taban * (1 - (deger || 0) / 100) : taban - (deger || 0));
};

// Bir kural listesinden (fiyat grubu kuralları ya da kampanyalar) bir ürüne
// uyan EN SPESİFİK kuralı bulur: ürün/ürün grubu > kategori > marka > tümü.
export const enSpesifikKural = (kurallar, parca) =>
  kurallar.find((k) => k.hedefTuru === "urun" && k.hedefDeger === parca.id) ||
  kurallar.find((k) => k.hedefTuru === "urunGrubu" && (k.hedefUrunIdleri || []).includes(parca.id)) ||
  kurallar.find((k) => k.hedefTuru === "kategori" && (k.hedefDeger === parca.kategori || k.hedefDeger === parca.anaKategori)) ||
  kurallar.find((k) => k.hedefTuru === "marka" && k.hedefDeger === parca.marka) ||
  kurallar.find((k) => k.hedefTuru === "tumu");

// Bir kampanyanın hedeflediği TÜM ürünleri bulur — önizleme, satış raporu
// ve stok kontrolü bunu kullanır.
export const kampanyaHedefUrunleri = (db, kampanya) =>
  db.parcalar.filter((p) => {
    if (p.aktif === false) return false;
    if (kampanya.hedefTuru === "tumu") return true;
    if (kampanya.hedefTuru === "urun") return p.id === kampanya.hedefDeger;
    if (kampanya.hedefTuru === "urunGrubu") return (kampanya.hedefUrunIdleri || []).includes(p.id);
    if (kampanya.hedefTuru === "kategori") return p.kategori === kampanya.hedefDeger || p.anaKategori === kampanya.hedefDeger;
    if (kampanya.hedefTuru === "marka") return p.marka === kampanya.hedefDeger;
    return false;
  });

// Kampanya önizlemesi — Ürün | Eski Fiyat | Kampanya Fiyatı | Kâr | Kâr Marjı
// (6. madde) + maliyet altı (5. madde) + stok yetersizliği (8. madde) uyarıları.
export const kampanyaOnizlemesiHesapla = (db, kampanyaTaslak) =>
  kampanyaHedefUrunleri(db, kampanyaTaslak).map((p) => {
    const kampanyaliFiyat = Math.round(iskontoUygula(p.satisFiyati, kampanyaTaslak.iskontoTuru, kampanyaTaslak.iskontoDeger, kampanyaTaslak.minimumAdet || 1, kampanyaTaslak) * 100) / 100;
    const maliyet = gecerliMaliyet(p, db);
    const kar = Math.round((kampanyaliFiyat - maliyet) * 100) / 100;
    const karMarji = kampanyaliFiyat > 0 ? (kar / kampanyaliFiyat) * 100 : null;
    const son30GunSatis = sonNGunSatisAdedi(db, p.id, 30);
    return { parca: p, eskiFiyat: p.satisFiyati, kampanyaliFiyat, maliyet, kar, karMarji, maliyetAlti: kar < -0.005, son30GunSatis, stokYetersizOlabilir: p.stok < son30GunSatis };
  });

// Kampanya Satış Raporu (7. madde) — satış kalemlerinde kalıcı olarak
// saklanan fiyatKaynagi ("Kampanya: <ad>") üzerinden, bu kampanyadan
// gerçekleşen TÜM satışları bulup özetler.
export const kampanyaSatisRaporu = (db, kampanya) => {
  const kalemler = db.satislar
    .filter((s) => s.durum !== "İptal Edildi")
    .flatMap((s) => s.kalemler.map((k) => ({ ...k, satisTarihi: s.tarih })))
    .filter((k) => k.fiyatKaynagi === `Kampanya: ${kampanya.ad}`);
  const adet = kalemler.reduce((t, k) => t + k.adet, 0);
  const ciro = kalemler.reduce((t, k) => t + (k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0)), 0);
  const brutKar = kalemler.reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);
  const normalFiyatCiro = kalemler.reduce((t, k) => {
    const parca = db.parcalar.find((p) => p.id === k.parcaId);
    return t + (parca ? parca.satisFiyati * k.adet : k.birimFiyat * k.adet);
  }, 0);
  return { adet, ciro: Math.round(ciro * 100) / 100, toplamIskonto: Math.max(0, Math.round((normalFiyatCiro - ciro) * 100) / 100), brutKar: Math.round(brutKar * 100) / 100 };
};

// MERKEZİ FİYAT ÇÖZÜMLEME — net öncelik sırasıyla:
// 1) Müşteriye özel fiyat  2) Müşteri fiyat grubu kuralı
// 3) Aktif kampanya (ürün/kategori/marka bazlı)  4) Normal satış fiyatı.
// Satış ekranı bir ürünü sepete eklerken HER ZAMAN bu fonksiyonu kullanır.
// adet parametresi opsiyoneldir (varsayılan 1) — miktar bazlı kampanya
// türleri (Kademeli %, X Al Y Öde) için kullanılır.
export const parcaFiyatiHesapla = (db, parca, musteri, adet = 1) => {
  if (musteri) {
    const ozel = db.musteriOzelFiyatlar.find((f) => f.musteriId === musteri.id && f.parcaId === parca.id);
    if (ozel) return { fiyat: ozel.fiyat, kaynak: "Müşteriye Özel Fiyat" };

    if (musteri.fiyatGrubuId) {
      const grup = db.musteriFiyatGruplari.find((g) => g.id === musteri.fiyatGrubuId);
      const kural = enSpesifikKural(db.fiyatGrubuKurallari.filter((k) => k.grupId === musteri.fiyatGrubuId), parca);
      if (kural && grup) {
        return { fiyat: Math.round(iskontoUygula(parca.satisFiyati, kural.iskontoTuru, kural.iskontoDeger) * 100) / 100, kaynak: `Fiyat Grubu: ${grup.ad}` };
      }
    }
  }

  const bugunIso = isoGun(new Date());
  const aktifKampanyalar = db.kampanyalar
    .filter((k) => k.aktif !== false && k.baslangicTarihi <= bugunIso && k.bitisTarihi >= bugunIso)
    // Müşteri grubu hedeflenmiş bir kampanya varsa, sadece o gruptaki
    // müşterilere uygulanır (1. adım, "Müşteri grubu" alanı).
    .filter((k) => !k.hedefMusteriGrubuId || (musteri && musteri.fiyatGrubuId === k.hedefMusteriGrubuId));
  const kampanya = enSpesifikKural(aktifKampanyalar, parca);
  if (kampanya) {
    return { fiyat: Math.round(iskontoUygula(parca.satisFiyati, kampanya.iskontoTuru, kampanya.iskontoDeger, adet, kampanya) * 100) / 100, kaynak: `Kampanya: ${kampanya.ad}` };
  }

  return { fiyat: parca.satisFiyati || 0, kaynak: "Normal Fiyat" };
};
