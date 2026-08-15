import { useState, useEffect } from "react";

// Henüz ayrı bir Kullanıcı modülü kurulmadığından, stok hareketlerindeki
// "İşlemi Yapan" bilgisi bu basit tarayıcı hafızasıyla hatırlanır — aynı
// kişi art arda işlem yaparken adını tekrar tekrar yazmak zorunda kalmaz.
export const sonKullaniciAdi = () => localStorage.getItem("akcan-son-kullanici") || "";
export const useIslemYapan = (aktifKullanici) => {
  const [ad, setAd] = useState(() => aktifKullanici?.adSoyad || sonKullaniciAdi());
  useEffect(() => {
    if (aktifKullanici?.adSoyad) setAd(aktifKullanici.adSoyad);
  }, [aktifKullanici?.id, aktifKullanici?.adSoyad]);
  return [ad, setAd];
};

export const sonKullaniciAdiKaydet = (ad) => {
  if (ad && ad.trim()) localStorage.setItem("akcan-son-kullanici", ad.trim());
};
