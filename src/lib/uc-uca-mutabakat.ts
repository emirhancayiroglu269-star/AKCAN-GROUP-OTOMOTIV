/**
 * Uçtan uca stok + satış + iade + finans mutabakatı.
 * Bu modül veri değiştirmez; yalnızca mevcut state üzerinde tutarsızlıkları raporlar.
 */
const yuvarla = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type MutabakatBulgusu = {
  tip: string;
  id: string;
  mesaj: string;
  beklenen?: number;
  kayitli?: number;
  fark?: number;
};

export const ucUcaMutabakatKontrolu = (db: any): MutabakatBulgusu[] => {
  const bulgular: MutabakatBulgusu[] = [];

  // 1) Satış ödeme mutabakatı
  for (const s of db.satislar || []) {
    if (s.durum === "İptal Edildi") continue;
    const toplam = yuvarla(s.genelToplam);
    const odemeToplami = yuvarla((s.odemeler || []).reduce((t: number, o: any) => t + Number(o.tutar || 0), 0));
    if (Math.abs(toplam - odemeToplami) > 0.01) {
      bulgular.push({
        tip: "satis-odeme",
        id: s.id,
        mesaj: "Satış genel toplamı ile ödeme satırları toplamı uyuşmuyor.",
        beklenen: toplam,
        kayitli: odemeToplami,
        fark: yuvarla(toplam - odemeToplami),
      });
    }
  }

  // 2) İade toplamı ile iade kalemleri toplamı mutabakatı
  for (const i of db.iadeler || []) {
    const kalemToplami = yuvarla((i.kalemler || []).reduce((t: number, k: any) => t + Number(k.adet || 0) * Number(k.birimFiyat || 0), 0));
    const kayitli = yuvarla(i.tutar);
    // Değişim işlemlerinde para farkı farklı olabilir; yine de negatif/bozuk tutarı yakala.
    if (kayitli < 0) {
      bulgular.push({ tip: "iade", id: i.id, mesaj: "İade tutarı negatif olamaz.", beklenen: 0, kayitli });
    }
    if (i.kapatmaYontemi !== "Değişim" && Math.abs(kayitli - kalemToplami) > 0.01) {
      bulgular.push({
        tip: "iade",
        id: i.id,
        mesaj: "İade kayıt tutarı ile iade kalemleri toplamı uyuşmuyor.",
        beklenen: kalemToplami,
        kayitli,
        fark: yuvarla(kalemToplami - kayitli),
      });
    }
  }

  // 3) Stok hareket zinciri: her parçanın son hareketindeki kalan stok,
  // mevcut ürün stoğuyla aynı olmalı. Hareketler yeni -> eski tutulur.
  for (const p of db.parcalar || []) {
    const hareketler = (db.stokHareketleri || [])
      .filter((h: any) => h.parcaId === p.id)
      .sort((a: any, b: any) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

    if (!hareketler.length) continue;
    const sonHareketStogu = yuvarla(hareketler[0].kalanStok);
    const stok = yuvarla(p.stok);
    if (Math.abs(sonHareketStogu - stok) > 0.01) {
      bulgular.push({
        tip: "stok",
        id: p.id,
        mesaj: "Ürün stoğu son stok hareketindeki kalan stokla uyuşmuyor.",
        beklenen: sonHareketStogu,
        kayitli: stok,
        fark: yuvarla(stok - sonHareketStogu),
      });
    }
  }

  // 4) Aynı satışın birden fazla aktif POS tahsilatı olmamalı.
  const posAnahtar = new Map<string, number>();
  for (const p of db.posTahsilatlari || []) {
    if (p.durum === "İptal") continue;
    const key = `${p.kaynakSatisId || ""}:${p.posId || ""}`;
    posAnahtar.set(key, (posAnahtar.get(key) || 0) + 1);
  }
  for (const [key, adet] of posAnahtar) {
    if (adet > 1) {
      bulgular.push({
        tip: "pos",
        id: key,
        mesaj: "Aynı satış/POS için birden fazla aktif tahsilat kaydı var.",
        beklenen: 1,
        kayitli: adet,
        fark: adet - 1,
      });
    }
  }

  return bulgular;
};

export const ucUcaMutabakatOzeti = (db: any) => {
  const bulgular = ucUcaMutabakatKontrolu(db);
  return {
    temiz: bulgular.length === 0,
    bulguSayisi: bulgular.length,
    kritik: bulgular.filter((x) => ["stok", "satis-odeme", "pos"].includes(x.tip)).length,
    bulgular,
  };
};
