export type UyariTipi =
  | "KRITIK_STOK"
  | "DUSUK_KAR"
  | "CARI_LIMIT"
  | "GECIKMIS_TAHSILAT"
  | "VADELI_EVRAK"
  | "BUTCE_ASIMI"
  | "OLAGANDISI_GIDER";

export type UyariSeviyesi = "KRITIK" | "YUKSEK" | "ORTA" | "BILGI";

export interface Uyari {
  id: string;
  tip: UyariTipi;
  seviye: UyariSeviyesi;
  baslik: string;
  mesaj: string;
  kaynakId?: string;
  tarih: string;
  okundu: boolean;
}

export interface UyariGirdisi {
  kritikStok: number;
  brutMarj: number;
  cariLimitAsimi: number;
  gecikmisTahsilat: number;
  vadesiGelenEvrak: number;
  butceGerceklesen: number;
  butce: number;
  olağandisiGider: number;
}

export interface UyariOzet {
  kritik: number;
  yuksek: number;
  orta: number;
  bilgi: number;
  toplam: number;
}

export function uyariOlustur(
  tip: UyariTipi,
  seviye: UyariSeviyesi,
  baslik: string,
  mesaj: string,
  tarih: string,
  kaynakId?: string
): Uyari {
  if (!baslik.trim() || !mesaj.trim()) {
    throw new Error("Uyarı başlık ve mesajı zorunlu.");
  }
  if (Number.isNaN(new Date(tarih).getTime())) {
    throw new Error("Uyarı tarihi geçersiz.");
  }

  return {
    id: crypto.randomUUID(),
    tip,
    seviye,
    baslik,
    mesaj,
    kaynakId,
    tarih,
    okundu: false,
  };
}

export function uyariKurallari(g: UyariGirdisi): UyariTipi[] {
  const sonuc: UyariTipi[] = [];

  if (g.kritikStok > 0) sonuc.push("KRITIK_STOK");
  if (g.brutMarj < 15) sonuc.push("DUSUK_KAR");
  if (g.cariLimitAsimi > 0) sonuc.push("CARI_LIMIT");
  if (g.gecikmisTahsilat > 0) sonuc.push("GECIKMIS_TAHSILAT");
  if (g.vadesiGelenEvrak > 0) sonuc.push("VADELI_EVRAK");
  if (g.butce > 0 && g.butceGerceklesen > g.butce) sonuc.push("BUTCE_ASIMI");
  if (g.olağandisiGider > 0) sonuc.push("OLAGANDISI_GIDER");

  return sonuc;
}

export function uyariOzetle(uyarilar: Uyari[]): UyariOzet {
  return {
    kritik: uyarilar.filter(u => u.seviye === "KRITIK").length,
    yuksek: uyarilar.filter(u => u.seviye === "YUKSEK").length,
    orta: uyarilar.filter(u => u.seviye === "ORTA").length,
    bilgi: uyarilar.filter(u => u.seviye === "BILGI").length,
    toplam: uyarilar.length,
  };
}
