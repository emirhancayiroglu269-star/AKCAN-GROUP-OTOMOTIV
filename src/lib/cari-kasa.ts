import { yeniId, zamanDamgasi } from "./format";

// Tedarikçi borç/ödeme hareketi uygular (cariler ile birebir aynı mantık).
// kaynakAlisId, bu hareketin hangi Mal Alış faturasından geldiğini işaretler
// — böylece fatura sonradan düzenlenirse eski etkisi tam olarak geri alınabilir.
// bakiyeSonrasi, hareket anındaki güncel bakiyeyi kalıcı olarak saklar —
// hareket geçmişi tablosunda "Bakiye" sütunu bu sayede yeniden hesaplama
// gerektirmeden doğru gösterilir.
export const tedarikciHareketiUygula = (prev, { tedarikciAdi, tutar, tur, aciklama, faturaNo = "", kaynakAlisId = undefined, kaynakKasaIslemiId = undefined, tarih = "" }) => {
  const ad = (tedarikciAdi || "").trim();
  if (!ad || !tutar || tutar <= 0) return prev;
  const mevcut = prev.tedarikciler.find((t) => t.ad.toLowerCase() === ad.toLowerCase());
  const eskiBakiye = mevcut?.bakiye || 0;
  const yeniBakiye = eskiBakiye + (tur === "borç" ? tutar : -tutar);
  const hareket = {
    id: yeniId("th"),
    tarih: tarih || zamanDamgasi(),
    tutar,
    tur,
    aciklama,
    faturaNo: faturaNo || "",
    kaynakAlisId,
    kaynakKasaIslemiId,
    bakiyeSonrasi: yeniBakiye,
  };
  let tedarikciler;
  if (mevcut) {
    tedarikciler = prev.tedarikciler.map((t) => (t.id === mevcut.id ? { ...t, bakiye: yeniBakiye, hareketler: [hareket, ...t.hareketler] } : t));
  } else {
    tedarikciler = [
      ...prev.tedarikciler,
      {
        id: yeniId("t"),
        ad,
        yetkiliKisi: "",
        telefon: "",
        eposta: "",
        vergiDairesi: "",
        vergiNo: "",
        adres: "",
        odemeVadesiGun: "",
        iskontoOrani: "",
        odemeYontemi: "",
        borcLimiti: "",
        notlar: "",
        aktif: true,
        bakiye: yeniBakiye,
        hareketler: [hareket],
      },
    ];
  }
  return { ...prev, tedarikciler };
};

// Müşteri (cari) borç/tahsilat hareketi uygular — tedarikçi mantığının
// birebir aynısı, sadece müşteri tarafı için. musteriId varsa doğrudan o
// karta işlenir (isim değişse bile doğru kart bulunur); yoksa isimle
// eşleştirilir, hiç kayıt yoksa "müşteri kartı açmadan satış" ilkesine
// uygun olarak otomatik minimal bir kart oluşturulur.
export const cariHareketiUygula = (prev, { musteriId, musteriAdi, tutar, tur, aciklama, belgeNo = "", kaynakSatisId = undefined, kaynakKasaIslemiId = undefined, tarih = "" }) => {
  const ad = (musteriAdi || "").trim();
  if (!tutar || tutar <= 0) return prev;
  const mevcut = musteriId
    ? prev.cariler.find((c) => c.id === musteriId)
    : prev.cariler.find((c) => c.ad.toLowerCase() === ad.toLowerCase());
  const eskiBakiye = mevcut?.bakiye || 0;
  const yeniBakiye = eskiBakiye + (tur === "borç" ? tutar : -tutar);
  const hareket = {
    id: yeniId("ch"),
    tarih: tarih || zamanDamgasi(),
    tutar,
    tur,
    aciklama,
    belgeNo: belgeNo || "",
    kaynakSatisId,
    kaynakKasaIslemiId,
    bakiyeSonrasi: yeniBakiye,
  };
  let cariler;
  if (mevcut) {
    cariler = prev.cariler.map((c) => (c.id === mevcut.id ? { ...c, bakiye: yeniBakiye, hareketler: [hareket, ...c.hareketler] } : c));
  } else {
    if (!ad) return prev;
    cariler = [
      ...prev.cariler,
      {
        id: yeniId("c"),
        ad,
        musteriTipi: "Bireysel",
        telefon: "",
        vergiTcNo: "",
        adres: "",
        borcLimiti: "",
        vadeGunu: "",
        iskontoOrani: "",
        fiyatGrubu: "",
        notlar: "",
        aktif: true,
        bakiye: yeniBakiye,
        hareketler: [hareket],
      },
    ];
  }
  return { ...prev, cariler };
};

// Stoğa paralel — bir Kasa/Hesabın (Nakit Kasa, POS, Banka…) bakiyesini
// değiştirmenin TEK yolu. Her çağrı kalıcı bir hareket kaydı bırakır; hesap
// hareketleri de stok hareketleri gibi asla doğrudan silinmez/değiştirilmez.
export const hesapHareketiUygula = (prev, { hesapId, tur, giris = 0, cikis = 0, aciklama = "", belgeNo = "", kullanici = "", kaynakId = undefined, tarih = "" }) => {
  if (!hesapId) return prev;
  const hesap = prev.hesaplar.find((h) => h.id === hesapId);
  if (!hesap) return prev;
  const yeniBakiye = Math.round(((hesap.bakiye || 0) + giris - cikis) * 100) / 100;
  const hareket = {
    id: yeniId("hh"),
    tarih: tarih || zamanDamgasi(),
    tur: tur || (giris > 0 ? "Giriş" : "Çıkış"),
    aciklama: aciklama || "",
    belgeNo: belgeNo || "",
    giris,
    cikis,
    bakiyeSonrasi: yeniBakiye,
    kullanici: kullanici || "",
    kaynakId,
  };
  return {
    ...prev,
    hesaplar: prev.hesaplar.map((h) => (h.id === hesapId ? { ...h, bakiye: yeniBakiye, hareketler: [hareket, ...h.hareketler] } : h)),
  };
};

// Bir POS cihazının komisyon kuralına göre komisyon tutarını hesaplar —
// yüzde, sabit tutar veya ikisi birlikte tanımlanabilir.
export const posKomisyonuHesapla = (pos, satisTutari) => {
  const yuzdeKismi = satisTutari * ((pos.komisyonYuzde || 0) / 100);
  const komisyon = Math.round((yuzdeKismi + (pos.komisyonSabit || 0)) * 100) / 100;
  const net = Math.round((satisTutari - komisyon) * 100) / 100;
  return { komisyon, net };
};

// Kendi hesapların arasında para transferi — GELİR veya GİDER olarak
// SAYILMAZ, sadece iki hesap hareketi (çıkış+giriş) oluşturur; hiçbir
// kasaIslemi/gider kaydı yaratılmadığından raporlarda gelir/gider olarak
// hiç görünmez, sadece hesap bakiyeleri arasında yer değiştirir.
export const hesapTransferiUygula = (prev, { kaynakHesapId, hedefHesapId, tutar, aciklama, kullanici }) => {
  const kaynak = prev.hesaplar.find((h) => h.id === kaynakHesapId);
  if (!kaynak || (kaynak.bakiye || 0) < tutar - 0.01) return null;
  let sonuc = hesapHareketiUygula(prev, {
    hesapId: kaynakHesapId,
    tur: "Hesaplar Arası Transfer (Çıkış)",
    cikis: tutar,
    aciklama,
    kullanici,
  });
  sonuc = hesapHareketiUygula(sonuc, {
    hesapId: hedefHesapId,
    tur: "Hesaplar Arası Transfer (Giriş)",
    giris: tutar,
    aciklama,
    kullanici,
  });
  return sonuc;
};

// Bir faturaya ait tüm tedarikçi hareketlerini bulup etkilerini geri alır —
// fatura düzenlendiğinde eskiyi silmeden önce kullanılır.
export const tedarikciHareketleriniGeriAl = (prev, kaynakAlisId) => ({
  ...prev,
  tedarikciler: prev.tedarikciler.map((t) => {
    const ilgili = t.hareketler.filter((h) => h.kaynakAlisId === kaynakAlisId);
    if (ilgili.length === 0) return t;
    const etki = ilgili.reduce((s, h) => s + (h.tur === "borç" ? h.tutar : -h.tutar), 0);
    return { ...t, bakiye: (t.bakiye || 0) - etki, hareketler: t.hareketler.filter((h) => h.kaynakAlisId !== kaynakAlisId) };
  }),
});
