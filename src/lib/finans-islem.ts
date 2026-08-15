import type { SatisKaydi, OdemeHareketi, CariHareketi, KasaBankaHareketi } from "./domain/erp-domain-models";
import { cariHareketiUygula, hesapHareketiUygula, tedarikciHareketiUygula } from "./cari-kasa";
import { yeniId, zamanDamgasi } from "./format";

export type FinansYon = "tahsilat" | "odeme";

export type FinansHesapSatiri = {
  hesapId: string;
  tutar: number;
  yontem?: string;
};

export type FinansIslemGirdisi = {
  yon: FinansYon;
  tarafId: string;
  tarafAdi: string;
  tutar: number;
  hesapSatirlari: FinansHesapSatiri[];
  aciklama?: string;
  belgeNo?: string;
  kullanici?: string;
  faturaTahsisleri?: { faturaId: string; tutar: number }[];
  tarih?: string;
};

export type FinansIslemSonucu = {
  db: any;
  islem: any;
};

const yuvarla = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const finansIslemIdempotentMi = (db: any, islemId: string) =>
  (db.kasaIslemleri || []).some((x: any) => x.id === islemId);

export const finansIslemDogrula = (db: any, input: FinansIslemGirdisi) => {
  const tutar = yuvarla(input.tutar);
  const satirlar = (input.hesapSatirlari || []).filter((x) => yuvarla(x.tutar) > 0);
  const toplamHesap = yuvarla(satirlar.reduce((s, x) => s + yuvarla(x.tutar), 0));
  const hatalar: string[] = [];

  if (!input.tarafId) hatalar.push("Cari taraf seçilmemiş.");
  if (!tutar || tutar <= 0) hatalar.push("İşlem tutarı 0'dan büyük olmalı.");
  if (!satirlar.length) hatalar.push("En az bir kasa/banka hesabı seçilmeli.");
  const hesapsizSatir = satirlar.find((x) => !x.hesapId);
  if (hesapsizSatir) hatalar.push("Ödeme/tahsilat satırında hangi kasa veya banka hesabının kullanılacağı seçilmelidir.");
  if (Math.abs(toplamHesap - tutar) > 0.01) hatalar.push("Kasa/banka dağılımı işlem toplamına eşit değil.");

  for (const satir of satirlar) {
    const hesap = (db.hesaplar || []).find((h: any) => h.id === satir.hesapId && h.aktif !== false);
    if (!hesap) {
      hatalar.push("Seçilen kasa/banka hesabı bulunamadı.");
      continue;
    }
    if (input.yon === "odeme" && yuvarla(hesap.bakiye || 0) + 0.01 < yuvarla(satir.tutar)) {
      hatalar.push(`${hesap.ad || "Seçilen hesap"} hesabında yeterli bakiye yok.`);
    }
  }

  if (input.yon === "odeme") {
    const tedarikci = (db.tedarikciler || []).find((t: any) => t.id === input.tarafId);
    if (!tedarikci) hatalar.push("Tedarikçi bulunamadı.");
    else {
      const borc = yuvarla(tedarikci.bakiye || 0);
      if (borc <= 0.01) hatalar.push("Tedarikçinin ödenecek cari borcu bulunmuyor.");
      if (tutar - borc > 0.01) hatalar.push(`Ödeme tutarı güncel cari borçtan fazla olamaz. Borç: ${borc.toFixed(2)}`);
    }
  } else {
    // Müşteri tahsilatı avans olarak da alınabilir; bu nedenle müşteri
    // bakiyesi 0 iken tahsilatı yasaklamıyoruz. Sadece kartın varlığını
    // doğruluyoruz. Cari tahsisleri varsa ayrıca fatura tahsisleri kontrol edilir.
    const musteri = (db.cariler || []).find((c: any) => c.id === input.tarafId);
    if (!musteri) hatalar.push("Müşteri bulunamadı.");
  }

  const tahsis = (input.faturaTahsisleri || []).filter((x) => yuvarla(x.tutar) > 0);
  const toplamTahsis = yuvarla(tahsis.reduce((s, x) => s + yuvarla(x.tutar), 0));
  if (toplamTahsis - tutar > 0.01) hatalar.push("Fatura tahsisleri işlem tutarından fazla olamaz.");

  return { gecerli: hatalar.length === 0, hatalar, tutar, satirlar };
};

/**
 * Tahsilat/ödeme için tek transaction benzeri uygulama noktası.
 * Önce tüm ön koşullar doğrulanır, sonra cari + kasa/banka + işlem günlüğü
 * aynı updateDb callback'i içinde birlikte uygulanır. Bu sayede modüller
 * farklı finans mantıkları üretmez.
 */
export const finansIslemiUygula = (prev: any, input: FinansIslemGirdisi, islemId = yeniId("ki")): FinansIslemSonucu | null => {
  if (finansIslemIdempotentMi(prev, islemId)) return null;
  const kontrol = finansIslemDogrula(prev, input);
  if (!kontrol.gecerli) return null;

  const tarih = input.tarih || zamanDamgasi();
  const tahsisler = (input.faturaTahsisleri || [])
    .map((x) => ({ faturaId: x.faturaId, tutar: yuvarla(x.tutar) }))
    .filter((x) => x.tutar > 0);

  const islem = {
    id: islemId,
    tarih,
    yon: input.yon,
    taraf: input.yon === "tahsilat" ? "musteri" : "tedarikci",
    tarafId: input.tarafId,
    tarafAdi: input.tarafAdi,
    tutar: kontrol.tutar,
    odemeSatirlari: kontrol.satirlar.map((x) => ({ yontem: x.yontem || "Nakit", hesapId: x.hesapId, tutar: yuvarla(x.tutar) })),
    aciklama: (input.aciklama || "").trim(),
    belgeNo: (input.belgeNo || "").trim(),
    islemiYapan: (input.kullanici || "").trim(),
    faturaTahsisleri: tahsisler,
    durum: "Tamamlandı",
  };

  let sonuc = prev;
  sonuc = input.yon === "tahsilat"
    ? cariHareketiUygula(sonuc, {
        musteriId: input.tarafId,
        musteriAdi: input.tarafAdi,
        tutar: kontrol.tutar,
        tur: "ödeme",
        aciklama: input.aciklama?.trim() || "Tahsilat",
        belgeNo: input.belgeNo?.trim() || "",
        kaynakKasaIslemiId: islemId,
        tarih,
      })
    : tedarikciHareketiUygula(sonuc, {
        tedarikciAdi: input.tarafAdi,
        tutar: kontrol.tutar,
        tur: "ödeme",
        aciklama: input.aciklama?.trim() || "Ödeme",
        faturaNo: input.belgeNo?.trim() || "",
        kaynakKasaIslemiId: islemId,
        tarih,
      });

  if (input.yon === "tahsilat") {
    sonuc = {
      ...sonuc,
      satislar: (sonuc.satislar || []).map((s: any) => {
        const t = tahsisler.find((x) => x.faturaId === s.id);
        return t ? { ...s, acikHesapOdenen: yuvarla((s.acikHesapOdenen || 0) + t.tutar) } : s;
      }),
    };
  } else {
    sonuc = {
      ...sonuc,
      malAlimlari: (sonuc.malAlimlari || []).map((m: any) => {
        const t = tahsisler.find((x) => x.faturaId === m.id);
        return t ? { ...m, odenenTutar: yuvarla((m.odenenTutar || 0) + t.tutar) } : m;
      }),
    };
  }

  for (const satir of kontrol.satirlar) {
    sonuc = hesapHareketiUygula(sonuc, {
      hesapId: satir.hesapId,
      tur: `${input.yon === "tahsilat" ? "Müşteri Tahsilatı" : "Tedarikçi Ödemesi"} — ${satir.yontem || "Nakit"}`,
      giris: input.yon === "tahsilat" ? yuvarla(satir.tutar) : 0,
      cikis: input.yon === "odeme" ? yuvarla(satir.tutar) : 0,
      belgeNo: input.belgeNo?.trim() || "",
      aciklama: `${input.tarafAdi}${input.aciklama?.trim() ? ` — ${input.aciklama.trim()}` : ""}`,
      kullanici: input.kullanici?.trim() || "",
      kaynakId: islemId,
      tarih,
    });
  }

  return { db: { ...sonuc, kasaIslemleri: [islem, ...(sonuc.kasaIslemleri || [])] }, islem };
};

/**
 * Tahsilat/ödeme iptali için tek merkezî ters işlem noktası.
 * Orijinal kayıt silinmez; cari + fatura tahsisi + kasa/banka ters hareketi
 * oluşturulur ve orijinal finans kaydı "İptal Edildi" olarak işaretlenir.
 */
export const finansIslemiIptalEt = (
  prev: any,
  islemId: string,
  iptalNedeni: string,
  kullanici: string,
  iptalId = yeniId("ki-iptal")
): FinansIslemSonucu | null => {
  if (!islemId || !iptalNedeni?.trim()) return null;

  const islem = (prev.kasaIslemleri || []).find((x: any) => x.id === islemId);
  if (!islem || islem.durum === "İptal Edildi") return null;

  // Aynı orijinal işlem için ters kayıt zaten oluşturulmuşsa ikinci kez uygulama.
  const zatenTers = (prev.kasaIslemleri || []).some(
    (x: any) => x.iptalEdilenIslemId === islemId || x.id === iptalId
  );
  if (zatenTers) return null;

  const tarih = zamanDamgasi();
  let sonuc = prev;

  sonuc = islem.yon === "tahsilat"
    ? cariHareketiUygula(sonuc, {
        musteriId: islem.tarafId,
        musteriAdi: islem.tarafAdi,
        tutar: islem.tutar,
        tur: "borç",
        aciklama: `İptal: ${islem.aciklama || "Tahsilat"} (${iptalNedeni.trim()})`,
        belgeNo: islem.belgeNo,
        kaynakKasaIslemiId: iptalId,
        tarih,
      })
    : tedarikciHareketiUygula(sonuc, {
        tedarikciAdi: islem.tarafAdi,
        tutar: islem.tutar,
        tur: "borç",
        aciklama: `İptal: ${islem.aciklama || "Ödeme"} (${iptalNedeni.trim()})`,
        faturaNo: islem.belgeNo,
        kaynakKasaIslemiId: iptalId,
        tarih,
      });

  const tahsisler = Array.isArray(islem.faturaTahsisleri) ? islem.faturaTahsisleri : [];
  if (islem.yon === "tahsilat") {
    sonuc = {
      ...sonuc,
      satislar: (sonuc.satislar || []).map((x: any) => {
        const t = tahsisler.find((a: any) => a.faturaId === x.id);
        return t ? { ...x, acikHesapOdenen: yuvarla((x.acikHesapOdenen || 0) - t.tutar) } : x;
      }),
    };
  } else {
    sonuc = {
      ...sonuc,
      malAlimlari: (sonuc.malAlimlari || []).map((x: any) => {
        const t = tahsisler.find((a: any) => a.faturaId === x.id);
        return t ? { ...x, odenenTutar: yuvarla((x.odenenTutar || 0) - t.tutar) } : x;
      }),
    };
  }

  for (const satir of islem.odemeSatirlari || []) {
    if (!satir.hesapId || yuvarla(satir.tutar) <= 0) continue;
    sonuc = hesapHareketiUygula(sonuc, {
      hesapId: satir.hesapId,
      tur: "İptal",
      giris: islem.yon === "odeme" ? yuvarla(satir.tutar) : 0,
      cikis: islem.yon === "tahsilat" ? yuvarla(satir.tutar) : 0,
      belgeNo: islem.belgeNo || "",
      aciklama: `İptal: ${islem.tarafAdi} (${iptalNedeni.trim()})`,
      kullanici: kullanici?.trim() || "",
      kaynakId: iptalId,
      tarih,
    });
  }

  const tersKaydi = {
    id: iptalId,
    tarih,
    yon: islem.yon === "tahsilat" ? "odeme" : "tahsilat",
    taraf: islem.taraf,
    tarafId: islem.tarafId,
    tarafAdi: islem.tarafAdi,
    tutar: islem.tutar,
    odemeSatirlari: (islem.odemeSatirlari || []).map((x: any) => ({ ...x })),
    aciklama: `İptal: ${islem.aciklama || (islem.yon === "tahsilat" ? "Tahsilat" : "Ödeme")} (${iptalNedeni.trim()})`,
    belgeNo: islem.belgeNo || "",
    islemiYapan: kullanici?.trim() || "",
    faturaTahsisleri: tahsisler.map((x: any) => ({ ...x })),
    durum: "Tamamlandı",
    iptalEdilenIslemId: islemId,
    tersIslem: true,
  };

  return {
    db: {
      ...sonuc,
      kasaIslemleri: [
        tersKaydi,
        ...(sonuc.kasaIslemleri || []).map((x: any) =>
          x.id === islemId
            ? {
                ...x,
                durum: "İptal Edildi",
                iptalNedeni: iptalNedeni.trim(),
                iptalEden: kullanici?.trim() || "",
                iptalTarihi: tarih,
                iptalTersIslemId: iptalId,
              }
            : x
        ),
      ],
    },
    islem: tersKaydi,
  };
};


export type FinansTutarlilikBulgu = {
  tip: "musteri" | "tedarikci" | "hesap" | "kasaIslemi";
  id: string;
  ad: string;
  beklenen: number;
  kayitli: number;
  fark: number;
  mesaj: string;
};

/** Kayıtlı bakiye ile hareketlerden türetilen bakiyeyi karşılaştırır. */
export const finansTutarlilikKontrolu = (db: any): FinansTutarlilikBulgu[] => {
  const bulgular: FinansTutarlilikBulgu[] = [];
  const esik = 0.01;

  for (const c of db.cariler || []) {
    const hareketler = Array.isArray(c.hareketler) ? c.hareketler : [];
    if (!hareketler.length) continue;
    const son = Number(hareketler[0]?.bakiyeSonrasi);
    if (!Number.isFinite(son)) continue;
    const kayitli = Number(c.bakiye) || 0;
    const fark = yuvarla(son - kayitli);
    if (Math.abs(fark) > esik) bulgular.push({ tip: "musteri", id: c.id, ad: c.ad, beklenen: yuvarla(son), kayitli: yuvarla(kayitli), fark, mesaj: "Müşteri cari bakiyesi son hareket bakiyesiyle uyuşmuyor." });
  }

  for (const t of db.tedarikciler || []) {
    const hareketler = Array.isArray(t.hareketler) ? t.hareketler : [];
    if (!hareketler.length) continue;
    const son = Number(hareketler[0]?.bakiyeSonrasi);
    if (!Number.isFinite(son)) continue;
    const kayitli = Number(t.bakiye) || 0;
    const fark = yuvarla(son - kayitli);
    if (Math.abs(fark) > esik) bulgular.push({ tip: "tedarikci", id: t.id, ad: t.ad, beklenen: yuvarla(son), kayitli: yuvarla(kayitli), fark, mesaj: "Tedarikçi cari bakiyesi son hareket bakiyesiyle uyuşmuyor." });
  }

  for (const h of db.hesaplar || []) {
    const hareketler = Array.isArray(h.hareketler) ? h.hareketler : [];
    if (!hareketler.length) continue;
    const son = Number(hareketler[0]?.bakiyeSonrasi);
    if (!Number.isFinite(son)) continue;
    const kayitli = Number(h.bakiye) || 0;
    const fark = yuvarla(son - kayitli);
    if (Math.abs(fark) > esik) bulgular.push({ tip: "hesap", id: h.id, ad: h.ad, beklenen: yuvarla(son), kayitli: yuvarla(kayitli), fark, mesaj: "Kasa/banka bakiyesi son hareket bakiyesiyle uyuşmuyor." });
  }

  const kasaIslemIdleri = (db.kasaIslemleri || []).map((x: any) => x.id).filter(Boolean);
  const tekrarliKasaIslemleri = kasaIslemIdleri.filter((id: any, i: number, arr: any[]) => arr.indexOf(id) !== i) as string[];
  for (const id of [...new Set(tekrarliKasaIslemleri)]) {
    bulgular.push({ tip: "kasaIslemi", id, ad: "Finans işlemleri", beklenen: 0, kayitli: 0, fark: 0, mesaj: "Aynı finans işlem ID'si birden fazla kez kayıtlı." });
  }

  // Hesap hareketleri yalnızca Tahsilat/Ödeme kaydına değil; satış, alış,
  // POS mutabakatı, gider, iade ve transfer gibi doğrudan finans üreten
  // işlemlere de bağlanabilir. Önceki kontrol yalnızca kasaIslemleri
  // listesini referans aldığı için bu geçerli hareketleri "yetim" sanıyordu.
  // Artık bütün bilinen finans kaynaklarını tek kümede topluyoruz.
  const finansKaynaklari = new Set<string>();
  for (const x of db.kasaIslemleri || []) if (x?.id) finansKaynaklari.add(String(x.id));
  for (const x of db.satislar || []) if (x?.id) finansKaynaklari.add(String(x.id));
  for (const x of db.malAlimlari || []) if (x?.id) finansKaynaklari.add(String(x.id));
  for (const x of db.giderler || []) if (x?.id) finansKaynaklari.add(String(x.id));
  for (const x of db.posTahsilatlari || []) if (x?.id) finansKaynaklari.add(`pos:${x.id}`);
  for (const x of db.iadeler || []) if (x?.id) finansKaynaklari.add(String(x.id));
  for (const x of db.depoTransferleri || []) if (x?.id) finansKaynaklari.add(`transfer:${x.id}`);

  const finansKaynakBilinenMi = (kaynakId: string) => {
    if (!kaynakId) return true;
    if (finansKaynaklari.has(kaynakId)) return true;
    if (kaynakId.startsWith("transfer-") || kaynakId.startsWith("depo-transfer:")) return true;

    // Satışın ödeme satırları kaynakId'yi "SATIS_ID:odeme:..." şeklinde
    // saklar; iptal/POS hareketleri de aynı satışa referans verebilir.
    const satisId = kaynakId.split(":")[0];
    if (satisId && (db.satislar || []).some((x: any) => x?.id === satisId)) return true;

    // Alış ödeme/finans hareketleri bazen doğrudan işlem ID'sini kullanır.
    if ((db.malAlimlari || []).some((x: any) => x?.id === kaynakId)) return true;

    // Gider ve iade kayıtları bazı eski sürümlerde kendi ID'lerini doğrudan
    // kaynakId olarak yazmıştır.
    if ((db.giderler || []).some((x: any) => x?.id === kaynakId)) return true;
    if ((db.iadeler || []).some((x: any) => x?.id === kaynakId)) return true;

    return false;
  };

  // Kasa/banka hareket zinciri kontrolü:
  // Hareketler yeni → eski tutulur. Her yeni hareketin bakiyeSonrasi,
  // bir önceki (daha eski) bakiyeye kendi giriş/çıkışını uyguladıktan sonra
  // ulaşmalıdır. Böylece aradan silinen/çift yazılan/yanlış bakiyeli hareketler
  // yakalanır.
  for (const h of db.hesaplar || []) {
    const hareketler = Array.isArray(h.hareketler) ? h.hareketler : [];
    for (let i = 0; i < hareketler.length; i++) {
      const hareket = hareketler[i];
      const sonrakiEski = hareketler[i + 1];
      if (!sonrakiEski) continue;
      const beklenenYeni = yuvarla(
        Number(sonrakiEski.bakiyeSonrasi || 0) +
        Number(hareket.giris || 0) -
        Number(hareket.cikis || 0)
      );
      const kayitliYeni = yuvarla(Number(hareket.bakiyeSonrasi));
      if (Math.abs(beklenenYeni - kayitliYeni) > esik) {
        bulgular.push({
          tip: "hesap",
          id: hareket.id || `${h.id}:${i}`,
          ad: h.ad,
          beklenen: beklenenYeni,
          kayitli: kayitliYeni,
          fark: yuvarla(beklenenYeni - kayitliYeni),
          mesaj: "Kasa/banka hareket zincirinde bakiye sırası uyuşmuyor.",
        });
      }
    }
  }

  for (const h of db.hesaplar || []) {
    for (const hareket of h.hareketler || []) {
      if (hareket.kaynakId && !finansKaynakBilinenMi(String(hareket.kaynakId))) {
        bulgular.push({
          tip: "kasaIslemi",
          id: hareket.id,
          ad: h.ad,
          beklenen: 0,
          kayitli: 0,
          fark: 0,
          mesaj: `Hesap hareketi ${hareket.kaynakId} numaralı bilinen bir finans işlemine bağlanamıyor.`,
        });
      }
    }
  }

  return bulgular;
};

export const finansTutarlilikOzeti = (db: any) => {
  const bulgular = finansTutarlilikKontrolu(db);
  const hesapSayisi = (db.hesaplar || []).length;
  const kasaBankaToplami = yuvarla((db.hesaplar || []).reduce((t: number, h: any) => t + (Number(h.bakiye) || 0), 0));
  const aktifHesapSayisi = (db.hesaplar || []).filter((h: any) => h.aktif !== false).length;
  return {
    uygun: bulgular.length === 0,
    toplamBulgu: bulgular.length,
    bulgular,
    hesapSayisi,
    aktifHesapSayisi,
    kasaBankaToplami,
    kontrolTarihi: zamanDamgasi(),
  };
};
