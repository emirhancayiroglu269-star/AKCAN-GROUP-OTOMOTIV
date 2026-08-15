// Kâr / Maliyet Hesaplama Motoru — TÜM sistemin (satış, raporlar, etiket,
// sipariş önerisi, kategori/marka özetleri) aynı hesaplamayı kullanması
// için tek merkezi yer.

// (ağırlıklı ortalama maliyet / moving average cost) sayesinde aynı parça
// farklı tarihlerde farklı fiyatlardan alınsa bile, o an elde bulunan stoğun
// gerçek maliyeti — dolayısıyla satıştaki gerçek kâr — her zaman doğru hesaplanır.
// Örnek: elde 10 adet @ 500₺ (ortalama maliyet 500₺) varken 10 adet daha
// 600₺'den alınırsa: yeni ortalama = (10×500 + 10×600) / 20 = 550₺.
export const agirlikliOrtalamaMaliyetHesapla = (eskiStok, eskiOrtalamaMaliyet, yeniAdet, yeniFiyat) => {
  const guvenliEskiStok = Math.max(0, eskiStok || 0);
  const guvenliEskiMaliyet = eskiOrtalamaMaliyet || 0;
  const toplamAdet = guvenliEskiStok + yeniAdet;
  if (toplamAdet <= 0) return yeniFiyat;
  return (guvenliEskiStok * guvenliEskiMaliyet + yeniAdet * yeniFiyat) / toplamAdet;
};

// Kâr hesaplarında kullanılacak "gerçek" maliyet: ortalama maliyet varsa onu,
// yoksa son alış fiyatını, o da yoksa referans alış fiyatını kullanır.
// Kâr/Maliyet Hesaplama Motoru'nun temel taşı — TÜM sistem (satış, raporlar,
// etiket, sipariş önerisi) aynı fonksiyonu çağırır, böylece "gerçek maliyet"
// her yerde aynı anlama gelir. db verilirse Ayarlar → Fiyat'taki "Maliyet
// Yöntemi" tercihini uygular (varsayılan: Ağırlıklı Ortalama — perakende
// yedek parça için önerilen yöntem; Son Alış Maliyeti alternatif olarak
// seçilebilir). Gerçek FIFO (parti/lot bazlı maliyet katmanları) BİLİNÇLİ
// OLARAK uygulanmadı: stok hareketi mimarisinin baştan yeniden tasarlanmasını
// gerektirir ve ağırlıklı ortalama zaten perakende yedek parça için önerilen,
// daha basit ve güvenilir yöntemdir.
export const gecerliMaliyet = (p, db?) => {
  const yontem = db?.ayarlar?.maliyetYontemi || "agirlikliOrtalama";
  if (yontem === "sonAlis") return p.sonAlisFiyati || p.ortalamaMaliyet || p.alisFiyati || 0;
  return p.ortalamaMaliyet || p.sonAlisFiyati || p.alisFiyati || 0;
};

// Perakende Satış Fiyatı KDV DAHİL girilir, maliyet (ortalama/son alış) ise
// KDV HARİÇ tutulur. Kârı doğru hesaplayabilmek için ikisini aynı zemine
// (KDV hariç) çekmek gerekir — aksi halde "elma ile armut" kıyaslanmış olur.
export const kdvHaricSatisFiyati = (p) => (p.satisFiyati || 0) / (1 + (p.kdvOrani || 0) / 100);
export const kdvDahilMaliyet = (p) => gecerliMaliyet(p) * (1 + (p.kdvOrani || 0) / 100);
export const karTutariHesapla = (p) => kdvHaricSatisFiyati(p) - gecerliMaliyet(p);

// - "Maliyete göre kâr oranı" (markup): kâr, MALİYETE bölünür. 1000 maliyetli
//   ürünü 1300'e satarsan: 300/1000 = %30.
// - "Satış üzerinden kâr marjı" (margin): kâr, SATIŞ FİYATINA bölünür.
//   Aynı örnekte: 300/1300 = %23,08. İkisi asla birbirine eşit değildir.
export const karOraniMarkup = (p) => {
  const maliyet = gecerliMaliyet(p);
  return maliyet > 0 ? (karTutariHesapla(p) / maliyet) * 100 : null;
};
export const karOraniMargin = (p) => {
  const net = kdvHaricSatisFiyati(p);
  return net > 0 ? (karTutariHesapla(p) / net) * 100 : null;
};

// Bir satış kaleminin gerçek (KDV hariç, satır iskontosu düşülmüş) birim
// satış fiyatı ve birim kârı — Satış ekranındaki satirKarBilgisi ile aynı
// mantık, raporlarda geçmiş satışlar üzerinde kullanılmak üzere tekrarlanır.
export const satisKalemiKarBilgisi = (k) => {
  const toplamEkIskonto = (k.iskontoTutari || 0) + (k.genelIskontoPayi || 0);
  const efektifBirimKdvDahil = k.adet > 0 ? (k.adet * k.birimFiyat - toplamEkIskonto) / k.adet : 0;
  const efektifBirimNet = efektifBirimKdvDahil / (1 + (k.kdvOrani || 0) / 100);
  const karBirim = efektifBirimNet - (k.maliyet || 0);
  const karYuzde = k.maliyet > 0 ? (karBirim / k.maliyet) * 100 : null;
  return { karBirim, karToplam: karBirim * k.adet, karYuzde };
};

// Aynı satış kalemi için, satır iskontosu HİÇ düşülmeden (liste fiyatı
// üzerinden) hesaplanan "teorik" kâr — "Brüt Kâr" ile "İskonto Sonrası Kâr"
// arasındaki farkı göstermek için kullanılır (46. adım, madde 2 ve 3).
export const satisKalemiListeKari = (k) => {
  const listeBirimNet = k.birimFiyat / (1 + (k.kdvOrani || 0) / 100);
  return (listeBirimNet - (k.maliyet || 0)) * k.adet;
};
