/**
 * V17 — Ters İşlem / Geri Alma Denetim Motoru
 *
 * Salt-okuma güvenlik kontrolüdür.
 * İptal/ters kayıtların orijinal işlemle çift yönlü bağını ve
 * tekrar ters işlem oluşup oluşmadığını kontrol eder.
 */

type TersBulgu = {
  id: string;
  tip: string;
  seviye: "kritik" | "uyari";
  mesaj: string;
  referanslar?: string[];
};

export const tersIslemDenetimKontrolu = (db: any): TersBulgu[] => {
  const b: TersBulgu[] = [];
  const finans = db.kasaIslemleri || [];

  // Aynı orijinal finans işlemi için birden fazla ters kayıt.
  const tersGruplari = new Map<string, any[]>();
  for (const x of finans) {
    const original = x?.iptalEdilenIslemId;
    if (!original) continue;
    tersGruplari.set(String(original), [...(tersGruplari.get(String(original)) || []), x]);
  }

  for (const [originalId, tersler] of tersGruplari) {
    if (tersler.length > 1) {
      b.push({
        id: originalId,
        tip: "cift-ters-islem",
        seviye: "kritik",
        mesaj: `Aynı orijinal finans işlemi için ${tersler.length} ters kayıt var.`,
        referanslar: tersler.map((x) => x.id).filter(Boolean),
      });
    }

    const original = finans.find((x: any) => x.id === originalId);
    if (!original) {
      b.push({
        id: originalId,
        tip: "yetim-ters-islem",
        seviye: "kritik",
        mesaj: "Ters kayıt mevcut ancak orijinal finans işlemi bulunamıyor.",
        referanslar: tersler.map((x) => x.id).filter(Boolean),
      });
    } else if (original.durum !== "İptal Edildi") {
      b.push({
        id: originalId,
        tip: "eksik-iptal-durumu",
        seviye: "kritik",
        mesaj: "Ters kayıt var ancak orijinal finans işlemi İptal Edildi olarak işaretlenmemiş.",
        referanslar: [originalId, ...tersler.map((x) => x.id).filter(Boolean)],
      });
    } else if (original.iptalTersIslemId && !tersler.some((x) => x.id === original.iptalTersIslemId)) {
      b.push({
        id: originalId,
        tip: "ters-link-kopuk",
        seviye: "kritik",
        mesaj: "Orijinal işlem ters kayıt ID'sini gösteriyor ancak ters kayıt listede bulunamıyor.",
        referanslar: [originalId, original.iptalTersIslemId],
      });
    }
  }

  // Ters kayıtların yönü orijinal işlemin ters yönü olmalı.
  for (const ters of finans.filter((x: any) => x?.tersIslem && x?.iptalEdilenIslemId)) {
    const original = finans.find((x: any) => x.id === ters.iptalEdilenIslemId);
    if (!original) continue;
    const beklenen = original.yon === "tahsilat" ? "odeme" : "tahsilat";
    if (ters.yon !== beklenen) {
      b.push({
        id: ters.id,
        tip: "ters-yon-hatasi",
        seviye: "kritik",
        mesaj: `Ters işlemin yönü yanlış. Beklenen: ${beklenen}.`,
        referanslar: [original.id, ters.id],
      });
    }
  }

  // Satış finans ters kaydı olup satış belgesi iptal edilmemişse.
  for (const x of finans.filter((k: any) => k?.tersIslem && k?.kaynakSatisId)) {
    const satis = (db.satislar || []).find((s: any) => s.id === x.kaynakSatisId);
    if (satis && satis.durum !== "İptal Edildi") {
      b.push({
        id: x.id,
        tip: "satis-iptal-durum-uyumsuz",
        seviye: "kritik",
        mesaj: "Satışa ait ters finans kaydı var ancak satış belgesi iptal edilmiş değil.",
        referanslar: [satis.id, x.id],
      });
    }
  }

  return b;
};

export const tersIslemDenetimOzeti = (db: any) => {
  const bulgular = tersIslemDenetimKontrolu(db);
  return {
    temiz: bulgular.length === 0,
    bulguSayisi: bulgular.length,
    kritik: bulgular.filter((x) => x.seviye === "kritik").length,
    bulgular,
  };
};
