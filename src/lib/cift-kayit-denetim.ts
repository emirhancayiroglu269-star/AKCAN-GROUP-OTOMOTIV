/**
 * V17 — Çift Kayıt / Idempotency Denetim Motoru
 *
 * Salt-okuma denetim katmanıdır. Hiçbir kayıt değiştirmez.
 * Amaç: aynı işin ikinci kez stoğa, kasaya, cariye veya POS'a
 * yansımasını sağlayabilecek mevcut veri izlerini yakalamaktır.
 */

type Bulgu = {
  id: string;
  tip: string;
  seviye: "kritik" | "uyari";
  mesaj: string;
  referanslar?: string[];
};

const duplicateIds = (rows: any[], alan = "id") => {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const row of rows || []) {
    const v = row?.[alan];
    if (!v) continue;
    const key = String(v);
    if (seen.has(key)) dup.add(key);
    else seen.add(key);
  }
  return [...dup];
};

const pushDuplicateIdFindings = (bulgular: Bulgu[], tip: string, rows: any[], label: string) => {
  for (const id of duplicateIds(rows)) {
    bulgular.push({
      id,
      tip,
      seviye: "kritik",
      mesaj: `${label} içinde aynı ID birden fazla kez bulunuyor.`,
      referanslar: [id],
    });
  }
};

export const ciftKayitDenetimKontrolu = (db: any): Bulgu[] => {
  const b: Bulgu[] = [];

  // 1) Aynı fiziksel kaydın iki kez oluşması.
  pushDuplicateIdFindings(b, "cift-kayit", db.satislar || [], "Satış");
  pushDuplicateIdFindings(b, "cift-kayit", db.malAlimlari || [], "Mal alış");
  pushDuplicateIdFindings(b, "cift-kayit", db.iadeler || [], "İade");
  pushDuplicateIdFindings(b, "cift-kayit", db.kasaIslemleri || [], "Kasa işlemi");
  pushDuplicateIdFindings(b, "cift-kayit", db.posTahsilatlari || [], "POS tahsilatı");
  pushDuplicateIdFindings(b, "cift-kayit", db.stokHareketleri || [], "Stok hareketi");
  pushDuplicateIdFindings(b, "cift-kayit", db.depoTransferleri || [], "Depo transferi");

  // 2) Aynı satış için aynı ödeme kaynağının tekrar üretilmesi.
  const odemeKaynaklari = new Map<string, string[]>();
  for (const h of db.hesaplar || []) {
    for (const m of h.hareketler || []) {
      const k = m?.kaynakId;
      if (!k || !String(k).includes(":odeme:")) continue;
      const key = String(k);
      odemeKaynaklari.set(key, [...(odemeKaynaklari.get(key) || []), `${h.id}:${m.id || ""}`]);
    }
  }
  for (const [kaynakId, refs] of odemeKaynaklari) {
    if (refs.length > 1) {
      b.push({
        id: kaynakId,
        tip: "cift-tahsilat",
        seviye: "kritik",
        mesaj: `Aynı satış ödeme kaynağı ${refs.length} finans hareketine bağlanmış.`,
        referanslar: refs,
      });
    }
  }

  // 3) Aynı satış için aktif POS tahsilatı birden fazla ise.
  const posGruplari = new Map<string, any[]>();
  for (const p of db.posTahsilatlari || []) {
    if (!p?.kaynakSatisId || p.durum === "İptal") continue;
    const key = `${p.kaynakSatisId}:${p.posId || ""}`;
    posGruplari.set(key, [...(posGruplari.get(key) || []), p]);
  }
  for (const [key, rows] of posGruplari) {
    if (rows.length > 1) {
      b.push({
        id: key,
        tip: "cift-pos",
        seviye: "kritik",
        mesaj: `Aynı satış + POS için ${rows.length} aktif tahsilat kaydı var.`,
        referanslar: rows.map((x) => x.id).filter(Boolean),
      });
    }
  }

  // 4) Aynı satışın aynı cari etkisinin iki kez yazılması.
  // Bir satışın iadesi ve satış iptali de aynı kaynak satış ID'sini taşıyabilir;
  // bu nedenle yalnızca kaynak ID'ye bakmak yanlış pozitif üretir. Aynı yön +
  // tutar + belge imzasını aynı kaynak üzerinde tekrar görmek gerçek çift kayıt
  // sinyalidir.
  const cariKaynaklari = new Map<string, string[]>();
  for (const c of db.cariler || []) {
    for (const h of c.hareketler || []) {
      const k = h?.kaynakSatisId;
      if (!k) continue;
      const key = [
        String(k),
        String(h.tur || ""),
        Number(h.tutar || 0),
        String(h.belgeNo || ""),
      ].join("|");
      cariKaynaklari.set(key, [...(cariKaynaklari.get(key) || []), `${c.id}:${h.id || ""}`]);
    }
  }
  for (const [imza, refs] of cariKaynaklari) {
    if (refs.length > 1) {
      b.push({
        id: `cari:${imza}`,
        tip: "cift-cari",
        seviye: "kritik",
        mesaj: `Aynı satış cari işlem imzası ${refs.length} kez kayıtlı.`,
        referanslar: refs,
      });
    }
  }

  // 5) Aynı alışın aynı tedarikçi cari etkisinin iki kez yazılması.
  const tedarikciKaynaklari = new Map<string, string[]>();
  for (const t of db.tedarikciler || []) {
    for (const h of t.hareketler || []) {
      const k = h?.kaynakAlisId;
      if (!k) continue;
      const key = [
        String(k),
        String(h.tur || ""),
        Number(h.tutar || 0),
        String(h.belgeNo || ""),
      ].join("|");
      tedarikciKaynaklari.set(key, [...(tedarikciKaynaklari.get(key) || []), `${t.id}:${h.id || ""}`]);
    }
  }
  for (const [imza, refs] of tedarikciKaynaklari) {
    if (refs.length > 1) {
      b.push({
        id: `tedarikci:${imza}`,
        tip: "cift-tedarikci-cari",
        seviye: "kritik",
        mesaj: `Aynı alış tedarikçi cari işlem imzası ${refs.length} kez kayıtlı.`,
        referanslar: refs,
      });
    }
  }

  // 6) Aynı stok belgesi/kalemi için birebir aynı hareket birden fazla kez yazılmışsa.
  const stokImza = new Map<string, string[]>();
  for (const h of db.stokHareketleri || []) {
    if (!h?.parcaId || !h?.belgeNo) continue;
    const key = [
      h.parcaId, h.tur, h.belgeNo,
      Number(h.giris || 0), Number(h.cikis || 0),
    ].join("|");
    stokImza.set(key, [...(stokImza.get(key) || []), h.id || ""]);
  }
  for (const [imza, refs] of stokImza) {
    if (refs.length > 1) {
      b.push({
        id: `stok:${imza}`,
        tip: "cift-stok",
        seviye: "kritik",
        mesaj: `Aynı stok belge/kalem imzası ${refs.length} kez kayıtlı.`,
        referanslar: refs.filter(Boolean),
      });
    }
  }

  return b;
};

export const ciftKayitDenetimOzeti = (db: any) => {
  const bulgular = ciftKayitDenetimKontrolu(db);
  return {
    temiz: bulgular.length === 0,
    bulguSayisi: bulgular.length,
    kritik: bulgular.filter((x) => x.seviye === "kritik").length,
    bulgular,
  };
};
