import type { SatisKaydi, OdemeHareketi, CariHareketi, KasaBankaHareketi } from "./domain/erp-domain-models";
import { yeniId, zamanDamgasi } from "./format";
import { cariHareketiUygula, hesapHareketiUygula, posKomisyonuHesapla } from "./cari-kasa";

export type SatisOdemeSatiri = {
  yontem: string;
  hesapId?: string | null;
  tutar: number;
  posId?: string | null;
};

export type SatisFinansGirdisi = {
  satis: any;
  belgeNo: string;
  musteriAdi: string;
  satisiYapan: string;
  odemeler: SatisOdemeSatiri[];
  tarih?: string;
};

export type SatisFinansSonucu = {
  db: any;
  uygulandi: boolean;
};

/**
 * Satışın cari + kasa/banka + POS takip ayağını tek merkezden uygular.
 * Stok hareketi ve satış belgesinin kendisi çağıran transaction içinde tutulur;
 * bu fonksiyon yalnızca finansal yan etkileri yönetir.
 */
export const satisFinansHareketleriniUygula = (prev: any, input: SatisFinansGirdisi): SatisFinansSonucu | null => {
  const satis = input.satis;
  if (!satis?.id) return null;

  // Aynı satışın finans tarafının ikinci kez yazılmasını kesin olarak engelle.
  // Satış belgesi henüz ana `satislar` koleksiyonuna eklenmemiş olsa bile,
  // daha önce yazılmış hesap/cari/POS hareketlerinden de idempotency kontrolü yap.
  if ((prev.satislar || []).some((s: any) => s.id === satis.id)) return null;

  const hesapFinansiVar = (prev.hesaplar || []).some((h: any) =>
    (h.hareketler || []).some((m: any) => typeof m.kaynakId === "string" && m.kaynakId.startsWith(`${satis.id}:odeme:`))
  );
  const cariFinansiVar = (prev.cariler || []).some((c: any) =>
    (c.hareketler || []).some((m: any) => m.kaynakSatisId === satis.id)
  );
  const posFinansiVar = (prev.posTahsilatlari || []).some((p: any) => p.kaynakSatisId === satis.id);
  if (hesapFinansiVar || cariFinansiVar || posFinansiVar) return null;

  const aktifHesaplar = (prev.hesaplar || []).filter((h: any) => h.aktif !== false);
  const odemeler = (input.odemeler || [])
    .map((o) => ({ ...o, tutar: Math.round(Number(o.tutar) * 100) / 100 }))
    .filter((o) => Number.isFinite(o.tutar) && o.tutar > 0);

  // Finans motoru UI'dan bağımsız da güvenli çalışmalıdır:
  // ödeme toplamı satış toplamına eşit değilse hiçbir finansal yan etki üretme.
  const satisToplami = Math.round(Number(satis.genelToplam || 0) * 100) / 100;
  const odemeToplami = Math.round(odemeler.reduce((t, o) => t + o.tutar, 0) * 100) / 100;
  if (Math.abs(odemeToplami - satisToplami) > 0.01) return null;

  for (const o of odemeler) {
    if (o.yontem === "Açık Hesap") {
      if (!satis.musteriId) return null;
      continue;
    }
    if (o.yontem === "Kredi Kartı") {
      const pos = (prev.posCihazlari || []).find((p: any) => p.id === o.posId && p.aktif !== false);
      if (!pos || !pos.hesapId || !aktifHesaplar.some((h: any) => h.id === pos.hesapId)) return null;
      continue;
    }
    const hesap = aktifHesaplar.find((h: any) => h.id === o.hesapId);
    if (!hesap) return null;
    // Satış tahsilatı hesap bakiyesini artırır; ödeme işlemlerindeki
    // "yeterli bakiye" kuralı burada uygulanamaz.
    continue;
  }

  const tarih = input.tarih || satis.tarih || zamanDamgasi();
  let sonuc = prev;

  const acikHesapTutari = odemeler.filter((o) => o.yontem === "Açık Hesap").reduce((t, o) => t + o.tutar, 0);
  if (acikHesapTutari > 0) {
    sonuc = cariHareketiUygula(sonuc, {
      musteriId: satis.musteriId,
      musteriAdi: input.musteriAdi,
      tutar: Math.round(acikHesapTutari * 100) / 100,
      tur: "borç",
      aciklama: "Perakende satış",
      belgeNo: input.belgeNo,
      kaynakSatisId: satis.id,
      tarih,
    });
  }

  for (const o of odemeler) {
    if (o.yontem === "Kredi Kartı" || o.yontem === "Açık Hesap") continue;
    sonuc = hesapHareketiUygula(sonuc, {
      hesapId: o.hesapId,
      tur: `Satış — ${o.yontem}`,
      giris: o.tutar,
      belgeNo: input.belgeNo,
      aciklama: `Satış ${input.belgeNo} (${input.musteriAdi})`,
      kullanici: input.satisiYapan,
      kaynakId: `${satis.id}:odeme:${o.yontem}:${o.hesapId}`,
      tarih,
    });
  }

  // POS tahsilatı yalnızca kredi kartı satırlarından üretilebilir.
  for (const o of odemeler.filter((x) => x.yontem === "Kredi Kartı")) {
    const pos = (sonuc.posCihazlari || []).find((p: any) => p.id === o.posId && p.aktif !== false);
    if (!pos) return null;
    const { komisyon, net } = posKomisyonuHesapla(pos, o.tutar);
    const beklenenTarih = new Date(new Date(tarih).getTime() + (pos.odemeVadesiGun || 0) * 86400000).toLocaleDateString("en-CA");
    const mevcut = (sonuc.posTahsilatlari || []).some((x: any) => x.kaynakSatisId === satis.id && x.posId === pos.id && x.durum !== "İptal");
    if (mevcut) return null;
    sonuc = {
      ...sonuc,
      posTahsilatlari: [
        {
          id: yeniId("pt"),
          tarih,
          posId: pos.id,
          kaynakSatisId: satis.id,
          satisTutari: o.tutar,
          komisyonTutari: komisyon,
          netTutar: net,
          beklenenTarih,
          durum: "Bekliyor",
          gercekTutar: null,
          eslesmeTarihi: null,
          not: `Satış ${input.belgeNo}`,
        },
        ...(sonuc.posTahsilatlari || []),
      ],
    };
  }

  return { db: sonuc, uygulandi: true };
};

/** Satış iptalinde satışın finansal etkilerini tek merkezden tersine çevirir. */
export const satisFinansHareketleriniTersineCevir = (prev: any, satis: any, belgeNo: string, kullanici: string): any | null => {
  if (!satis?.id) return null;
  if (satis.durum === "İptal Edildi") return null;

  const odemeler = (satis.odemeler || []).filter((o: any) => Number(o.tutar) > 0);
  let sonuc = prev;

  const acikHesapTutari = odemeler.filter((o: any) => o.yontem === "Açık Hesap").reduce((t: number, o: any) => t + Number(o.tutar || 0), 0);
  if (acikHesapTutari > 0 && satis.musteriId) {
    sonuc = cariHareketiUygula(sonuc, {
      musteriId: satis.musteriId,
      musteriAdi: satis.musteriAdi,
      tutar: acikHesapTutari,
      tur: "ödeme",
      aciklama: `Satış iptali #${belgeNo}`,
      belgeNo,
      kaynakSatisId: satis.id,
    });
  }

  for (const o of odemeler) {
    if (o.yontem === "Açık Hesap" || o.yontem === "Kredi Kartı") continue;
    if (!o.hesapId) continue;
    sonuc = hesapHareketiUygula(sonuc, {
      hesapId: o.hesapId,
      tur: `Satış İptali — ${o.yontem}`,
      giris: 0,
      cikis: Number(o.tutar || 0),
      belgeNo,
      aciklama: `${satis.musteriAdi} — Satış iptali`,
      kullanici,
      kaynakId: `${satis.id}:iptal:${o.yontem}:${o.hesapId}`,
    });
  }

  // POS mutabakatı henüz bankaya işlenmediyse yalnızca bekleyen tahsilatı iptal et.
  sonuc = {
    ...sonuc,
    posTahsilatlari: (sonuc.posTahsilatlari || []).map((p: any) =>
      p.kaynakSatisId === satis.id && p.durum !== "İptal" && p.gercekTutar == null
        ? { ...p, durum: "İptal", eslesmeTarihi: zamanDamgasi() }
        : p
    ),
  };

  return sonuc;
};
