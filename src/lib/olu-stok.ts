// Bir ürünün en son satıldığı tarihi (iptal edilmemiş satışlardan) bulur.
export const sonSatisTarihiBul = (db, parcaId) => {
  for (const s of db.satislar) {
    if (s.durum === "İptal Edildi") continue;
    if (s.kalemler.some((k) => k.parcaId === parcaId)) return s.tarih;
  }
  return null;
};

// Son N gündeki toplam satılan adedi hesaplar (iptal edilmiş satışlar hariç).
export const sonNGunSatisAdedi = (db, parcaId, gunSayisi) => {
  const esikTarih = new Date(Date.now() - gunSayisi * 86400000);
  let toplam = 0;
  db.satislar.forEach((s) => {
    if (s.durum === "İptal Edildi") return;
    if (new Date(s.tarih) < esikTarih) return;
    s.kalemler.forEach((k) => {
      if (k.parcaId === parcaId) toplam += k.adet;
    });
  });
  return toplam;
};

export const SATIS_HIZI_SINIF_GORSELI = {
  Hızlı: { emoji: "🟢", ton: "green" },
  Normal: { emoji: "🟡", ton: "yellow" },
  Yavaş: { emoji: "🟠", ton: "yellow" },
  "Ölü Stok": { emoji: "🔴", ton: "red" },
};

// Bir ürünün en son satış tarihini bulur (hiç satılmadıysa null).
export const parcaSonSatisTarihi = (db, parcaId) => {
  let sonTarih = null;
  db.satislar.forEach((s) => {
    if (s.durum === "İptal Edildi") return;
    if (!s.kalemler.some((k) => k.parcaId === parcaId)) return;
    if (!sonTarih || s.tarih > sonTarih) sonTarih = s.tarih;
  });
  return sonTarih;
};

// Satış hızına göre sınıflandırma (1. ve 10. madde) — eşikler Ayarlar'dan
// özelleştirilebilir. "Ölü stok" sadece "hiç satmayan" değil, belirlenen gün
// eşiğinden UZUN SÜREDİR satılmayan anlamına gelir (10. madde).
export const satisHiziSiniflandir = (db, parca) => {
  const esik = db.ayarlar?.satisHiziEsikleri || { hizliEsigi: 10, normalEsigiMin: 3, yavasEsigiMin: 1, oluStokGunEsigi: 90 };
  const son30 = sonNGunSatisAdedi(db, parca.id, 30);
  const sonSatisTarihi = parcaSonSatisTarihi(db, parca.id);
  const gunFarki = sonSatisTarihi ? Math.floor((Date.now() - new Date(sonSatisTarihi).getTime()) / 86400000) : null;
  if (gunFarki !== null && gunFarki >= esik.oluStokGunEsigi) return "Ölü Stok";
  if (son30 >= esik.hizliEsigi) return "Hızlı";
  if (son30 >= esik.normalEsigiMin) return "Normal";
  if (son30 >= esik.yavasEsigiMin) return "Yavaş";
  return "Ölü Stok"; // 0 satış (hiç satılmamış dahil, hiç satılmamışsa da ölü stok sayılır)
};

// Stok yaşı (4. madde) — ürünün ilk stok girişinden bu yana geçen süreye göre.
export const stokYasiGunu = (db, parcaId) => {
  const ilkHareket = [...db.stokHareketleri].filter((h) => h.parcaId === parcaId && h.giris > 0).sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())[0];
  if (!ilkHareket) return null;
  return Math.floor((Date.now() - new Date(ilkHareket.tarih).getTime()) / 86400000);
};
export const STOK_YASI_GRUPLARI = ["0–30 gün", "31–90 gün", "91–180 gün", "181–365 gün", "365+ gün"];
export const stokYasiGrubu = (gun) => {
  if (gun === null) return "Bilinmiyor";
  if (gun <= 30) return "0–30 gün";
  if (gun <= 90) return "31–90 gün";
  if (gun <= 180) return "91–180 gün";
  if (gun <= 365) return "181–365 gün";
  return "365+ gün";
};

// Ölü/yavaş stok için aksiyon önerileri (6. madde) — kural tabanlı, basit
// ama işe yarar öneriler; kullanıcı bunlardan istediğini uygular.
export const oluStokAksiyonOnerileri = (db, parca, sinif) => {
  const oneriler = [];
  if (sinif === "Ölü Stok" || sinif === "Yavaş") {
    oneriler.push("İndirim yap / Kampanyaya al");
    oneriler.push("Satış fiyatını düşür");
    oneriler.push("Stok alımını durdur (yeni sipariş önerme)");
    if (parca.tedarikci) oneriler.push(`${parca.tedarikci}'ye iade et`);
    if (db.depolar.length > 1) oneriler.push("Başka depoya/şubeye transfer et");
  }
  return oneriler;
};
