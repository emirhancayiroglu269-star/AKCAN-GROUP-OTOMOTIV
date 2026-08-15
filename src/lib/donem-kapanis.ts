/**
 * V17 — Aylık / Dönem Sonu Kapanış Motoru
 *
 * Gün sonu kapanışlarının üstünde, seçilen dönem için finansal performansı
 * standartlaştırır ve aynı dönemin ikinci kez kapatılmasını engeller.
 */
import { donemKarOzetiHesapla, donemKarsilastir } from "../services/rapor-service";
import { ucUcaMutabakatOzeti } from "./uc-uca-mutabakat";
import { finansTutarlilikOzeti } from "./finans-islem";
import { ciftKayitDenetimOzeti } from "./cift-kayit-denetim";
import { tersIslemDenetimOzeti } from "./ters-islem-denetim";
import { yetkiDenetimOzeti } from "./yetki-denetim";

const gun = (x: any) => String(x || "").slice(0, 10);
const yuvarla = (n: any) => Math.round((Number(n) || 0) * 100) / 100;

export const donemKapanisKontrolu = (db: any, baslangic: string, bitis: string) => {
  const bulgular: any[] = [];
  if (!baslangic || !bitis || baslangic > bitis) {
    bulgular.push({ tip: "donem-tarih", seviye: "kritik", mesaj: "Dönem başlangıç/bitiş tarihleri geçersiz." });
    return { temiz: false, bulguSayisi: bulgular.length, kritik: 1, bulgular };
  }

  const mevcut = (db.donemKapanislari || []).filter(Boolean).find(
    (x: any) => gun(x.baslangic) === baslangic && gun(x.bitis) === bitis && x.durum === "Kapalı"
  );
  if (mevcut) {
    bulgular.push({ tip: "cift-donem-kapanis", seviye: "kritik", mesaj: "Bu dönem zaten kapatılmış.", referanslar: [mevcut.id] });
  }

  const gunler = (db.gunSonlari || []).filter((g: any) => g.durum === "Kapalı");
  const acikGunler = gunler.filter((g: any) => gun(g.tarih) >= baslangic && gun(g.tarih) <= bitis && g.kapanisDurumu !== "MUTABIK");
  for (const g of acikGunler) {
    bulgular.push({ tip: "gun-kapanis-mutabik-degil", seviye: "kritik", mesaj: `${gun(g.tarih)} gün sonu MUTABIK değil.`, referanslar: [g.id] });
  }

  const mutabakat = ucUcaMutabakatOzeti(db);
  const finans = finansTutarlilikOzeti(db);
  const cift = ciftKayitDenetimOzeti(db);
  const ters = tersIslemDenetimOzeti(db);
  const yetki = yetkiDenetimOzeti(db);
  const sistemBulgular: any[] = [...(mutabakat.bulgular || []), ...(finans.bulgular || []), ...(cift.bulgular || []), ...(ters.bulgular || []), ...(yetki.bulgular || [])];
  for (const b of sistemBulgular) {
    bulgular.push({ tip: `sistem-${b.tip || "bulgu"}`, seviye: b.seviye || "kritik", mesaj: b.mesaj, referanslar: b.referanslar });
  }

  return {
    temiz: bulgular.length === 0,
    bulguSayisi: bulgular.length,
    kritik: bulgular.filter((x) => x.seviye === "kritik").length,
    bulgular,
    ozet: donemKarOzetiHesapla(db, baslangic, bitis),
  };
};

export const donemKapanisKaydiOlustur = (
  db: any,
  baslangic: string,
  bitis: string,
  kapatanKullanici: string
) => {
  const kontrol = donemKapanisKontrolu(db, baslangic, bitis);
  if (!kontrol.temiz) return null;

  const oncekiBaslangic = new Date(`${baslangic}T00:00:00`);
  const oncekiBitis = new Date(`${bitis}T00:00:00`);
  const gunSayisi = Math.max(1, Math.round((oncekiBitis.getTime() - oncekiBaslangic.getTime()) / 86400000) + 1);
  const oncekiBitisDate = new Date(oncekiBaslangic.getTime() - 86400000);
  const oncekiBaslangicDate = new Date(oncekiBitisDate.getTime() - (gunSayisi - 1) * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const onceki = donemKarOzetiHesapla(db, iso(oncekiBaslangicDate), iso(oncekiBitisDate));
  const degisim = (a: number, b: number) => b === 0 ? (a === 0 ? 0 : null) : yuvarla(((a - b) / Math.abs(b)) * 100);

  return {
    id: `dk-${Date.now().toString(36)}`,
    baslangic,
    bitis,
    durum: "Kapalı",
    kapanisDurumu: "MUTABIK",
    kapatanKullanici,
    kapanisZamani: new Date().toISOString(),
    ozet: kontrol.ozet,
    oncekiDonem: onceki,
    degisim: {
      netCiroKdvDahilYuzde: degisim(kontrol.ozet.netCiroKdvDahil, onceki.netCiroKdvDahil),
      brutKarYuzde: degisim(kontrol.ozet.brutKar, onceki.brutKar),
      netFaaliyetKariYuzde: degisim(kontrol.ozet.netFaaliyetKari, onceki.netFaaliyetKari),
    },
    kontrol: { bulguSayisi: 0, kritik: 0 },
  };
};

export const donemKarsilastirmaRaporu = (db: any, b1: string, s1: string, b2: string, s2: string) =>
  donemKarsilastir(db, b1, s1, b2, s2);
