/**
 * V17 — Gün Sonu / Dönem Kapanış Motoru
 *
 * Gün sonunu yalnızca "bir kayıt ekleme" olarak değil, kapanış öncesi
 * mutabakat kapısı olarak ele alır. Kasa/POS sayımı, kritik veri
 * bütünlüğü ve kapanışın tekilliği aynı noktada kontrol edilir.
 */
import { gunSonuOzetiHesapla } from "../services/rapor-service";
import { ucUcaMutabakatOzeti } from "./uc-uca-mutabakat";
import { finansTutarlilikOzeti } from "./finans-islem";
import { ciftKayitDenetimOzeti } from "./cift-kayit-denetim";
import { tersIslemDenetimOzeti } from "./ters-islem-denetim";
import { yetkiDenetimOzeti } from "./yetki-denetim";
import { stokDegerlemeOzetiHesapla } from "../core/stok-analiz";

const yuvarla = (n: any) => Math.round((Number(n) || 0) * 100) / 100;
const gun = (t: any) => String(t || "").slice(0, 10);

export const gunSonuKapanisKontrolu = (
  db: any,
  tarih: string,
  kasaSayimlari: any[] = [],
  posKontrolleri: any[] = []
) => {
  const bulgular: any[] = [];

  if (!tarih) {
    bulgular.push({ tip: "tarih", seviye: "kritik", mesaj: "Kapanış tarihi bulunamadı." });
    return { temiz: false, bulguSayisi: bulgular.length, kritik: 1, bulgular };
  }

  const mevcut = (db.gunSonlari || []).filter(Boolean).find((g: any) => gun(g.tarih) === tarih && g.durum === "Kapalı");
  if (mevcut) {
    bulgular.push({ tip: "cift-kapanis", seviye: "kritik", mesaj: `${tarih} günü zaten kapalı.` , referanslar: [mevcut.id] });
  }

  const nakitHesaplar = (db.hesaplar || []).filter((h: any) => h.tip === "Nakit Kasa" && h.aktif !== false);
  for (const h of nakitHesaplar) {
    const kayit = kasaSayimlari.find((x: any) => x.hesapId === h.id);
    if (!kayit || kayit.sayilan === null || kayit.sayilan === undefined || Number.isNaN(Number(kayit.sayilan))) {
      bulgular.push({ tip: "kasa-sayim-eksik", seviye: "kritik", mesaj: `${h.ad} için gerçek kasa sayımı girilmedi.`, referanslar: [h.id] });
    } else if (Math.abs(yuvarla(Number(kayit.sayilan) - Number(kayit.beklenen))) > 0.01) {
      bulgular.push({
        tip: "kasa-farki",
        seviye: "kritik",
        mesaj: `${h.ad} sayımı program bakiyesiyle uyuşmuyor. Fark: ${yuvarla(Number(kayit.sayilan) - Number(kayit.beklenen)).toFixed(2)} TL.`,
        referanslar: [h.id],
      });
    }
  }

  const aktifPoslar = (db.posCihazlari || []).filter((p: any) => p.aktif !== false);
  for (const p of aktifPoslar) {
    const programToplami = (db.posTahsilatlari || [])
      .filter((x: any) => x.posId === p.id && gun(x.tarih) === tarih && x.durum !== "İptal")
      .reduce((t: number, x: any) => t + Number(x.satisTutari || 0), 0);
    if (programToplami > 0) {
      const kayit = posKontrolleri.find((x: any) => x.posId === p.id);
      if (!kayit || kayit.gercekToplam === null || kayit.gercekToplam === undefined || Number.isNaN(Number(kayit.gercekToplam))) {
        bulgular.push({ tip: "pos-sayim-eksik", seviye: "kritik", mesaj: `${p.ad} için POS gerçek toplamı girilmedi.`, referanslar: [p.id] });
      } else if (Math.abs(yuvarla(Number(kayit.gercekToplam) - Number(kayit.programToplami))) > 0.01) {
        bulgular.push({
          tip: "pos-farki",
          seviye: "kritik",
          mesaj: `${p.ad} gerçek toplamı program toplamıyla uyuşmuyor. Fark: ${yuvarla(Number(kayit.gercekToplam) - Number(kayit.programToplami)).toFixed(2)} TL.`,
          referanslar: [p.id],
        });
      }
    }
  }

  const mutabakat = ucUcaMutabakatOzeti(db);
  const finans = finansTutarlilikOzeti(db);
  const cift = ciftKayitDenetimOzeti(db);
  const ters = tersIslemDenetimOzeti(db);
  const yetki = yetkiDenetimOzeti(db);

  const sistemBulgular: any[] = [...(mutabakat.bulgular || []), ...(finans.bulgular || []), ...(cift.bulgular || []), ...(ters.bulgular || []), ...(yetki.bulgular || [])];
  for (const b of sistemBulgular) {
    bulgular.push({
      tip: `sistem-${b.tip || "bulgu"}`,
      seviye: b.seviye || "kritik",
      mesaj: b.mesaj,
      referanslar: b.referanslar,
    });
  }

  return {
    temiz: bulgular.length === 0,
    bulguSayisi: bulgular.length,
    kritik: bulgular.filter((x) => x.seviye === "kritik").length,
    bulgular,
    ozet: gunSonuOzetiHesapla(db, tarih),
  };
};

export const gunSonuKapanisKaydiOlustur = (
  db: any,
  tarih: string,
  kapatanKullanici: string,
  kasaSayimlari: any[] = [],
  posKontrolleri: any[] = []
) => {
  const kontrol = gunSonuKapanisKontrolu(db, tarih, kasaSayimlari, posKontrolleri);
  if (!kontrol.temiz) return null;

  const aktifParcalar = (db.parcalar || []).filter(
    (p: any) => p.aktif !== false && p.urunTipi !== "Stoksuz" && p.urunTipi !== "Set"
  );
  const stok = stokDegerlemeOzetiHesapla(db, aktifParcalar);

  return {
    id: `gs-${Date.now().toString(36)}`,
    tarih,
    kapatanKullanici,
    kapanisZamani: new Date().toISOString(),
    durum: "Kapalı",
    ozet: kontrol.ozet,
    kasaSayimlari: kasaSayimlari.map((x: any) => ({
      ...x,
      sayilan: yuvarla(x.sayilan),
      fark: yuvarla(Number(x.sayilan) - Number(x.beklenen)),
    })),
    posKontrolleri: posKontrolleri.map((x: any) => ({
      ...x,
      gercekToplam: yuvarla(x.gercekToplam),
      fark: yuvarla(Number(x.gercekToplam) - Number(x.programToplami)),
    })),
    stokDegeriAnlikGoruntu: {
      toplamMaliyet: stok.toplamMaliyet,
      toplamSatisDegeri: stok.toplamSatisDegeri,
    },
    kapanisDurumu: "MUTABIK",
    kapanisKontrolu: {
      bulguSayisi: 0,
      kritik: 0,
      kontrolZamani: new Date().toISOString(),
    },
  };
};
