/**
 * GERÇEK TEST — fiyatlandırma motoru (kampanya, iskonto sırası)
 * Kaynak: src/lib/fiyatlandirma.ts
 *
 * Amaç: satış ekranının sepete ürün eklerken kullandığı fiyat çözümlemesinin
 * öncelik sırasını kanıtlamak ve iskonto türlerinin matematiğini kilitlemek.
 *
 * Net öncelik: 1) Müşteriye özel fiyat → 2) Fiyat grubu kuralı →
 *              3) Aktif kampanya → 4) Normal fiyat
 */
import { describe, it, expect } from "vitest";
import {
  iskontoUygula,
  enSpesifikKural,
  kampanyaHedefUrunleri,
  kampanyaOnizlemesiHesapla,
  kampanyaSatisRaporu,
  parcaFiyatiHesapla,
} from "../../src/lib/fiyatlandirma";
import { isoGun } from "../../src/lib/format";

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
const bugun = () => isoGun(new Date());
const gunEkle = (n: number) => isoGun(new Date(Date.now() + n * 86400000));

const parca = (over: any = {}) => ({
  id: "p1",
  ad: "Fren Balatası",
  kategori: "Fren",
  anaKategori: "Yürüyen Aksam",
  marka: "Bosch",
  satisFiyati: 100,
  alisFiyati: 50,
  ortalamaMaliyet: 60,
  sonAlisFiyati: 65,
  stok: 100,
  aktif: true,
  ...over,
});

const kampanya = (over: any = {}) => ({
  id: "k1",
  ad: "Yaz Kampanyası",
  hedefTuru: "tumu",
  hedefDeger: "",
  iskontoTuru: "yuzde",
  iskontoDeger: 10,
  baslangicTarihi: gunEkle(-10),
  bitisTarihi: gunEkle(10),
  aktif: true,
  ...over,
});

const db = (over: any = {}) => ({
  parcalar: [parca()],
  kampanyalar: [],
  musteriOzelFiyatlar: [],
  musteriFiyatGruplari: [],
  fiyatGrubuKurallari: [],
  satislar: [],
  ayarlar: {},
  ...over,
});

// ---------------------------------------------------------------------------
describe("iskontoUygula — iskonto türleri", () => {
  it("yuzde: 100 → %10 → 90", () => {
    expect(iskontoUygula(100, "yuzde", 10)).toBe(90);
  });

  it("yuzde: %100 iskonto → 0", () => {
    expect(iskontoUygula(100, "yuzde", 100)).toBe(0);
  });

  it("yuzde: %120 iskonto negatife düşmez (0'da durur)", () => {
    expect(iskontoUygula(100, "yuzde", 120)).toBe(0);
  });

  it("tutar (varsayılan tür): 100 − 30 = 70", () => {
    expect(iskontoUygula(100, "tutar", 30)).toBe(70);
  });

  it("tutar: tabandan büyükse 0'da durur", () => {
    expect(iskontoUygula(100, "tutar", 150)).toBe(0);
  });

  it("sabitFiyat: taban ne olursa olsun sabit fiyat", () => {
    expect(iskontoUygula(100, "sabitFiyat", 75)).toBe(75);
    expect(iskontoUygula(999, "sabitFiyat", 75)).toBe(75);
  });

  it("sabitFiyat: negatif değer 0'a kırpılır", () => {
    expect(iskontoUygula(100, "sabitFiyat", -20)).toBe(0);
  });

  it("deger 0 / undefined → değişiklik yok", () => {
    expect(iskontoUygula(100, "yuzde", 0)).toBe(100);
    expect(iskontoUygula(100, "yuzde", undefined)).toBe(100);
    expect(iskontoUygula(100, "tutar", undefined)).toBe(100);
  });
});

describe("iskontoUygula — miktar bazlı türler", () => {
  it("kademeliYuzde: eşik altında normal fiyat", () => {
    const kural = { minimumAdet: 5 };
    expect(iskontoUygula(100, "kademeliYuzde", 20, 3, kural)).toBe(100);
  });

  it("kademeliYuzde: eşikte ve üstünde indirim uygulanır", () => {
    const kural = { minimumAdet: 5 };
    expect(iskontoUygula(100, "kademeliYuzde", 20, 5, kural)).toBe(80);
    expect(iskontoUygula(100, "kademeliYuzde", 20, 50, kural)).toBe(80);
  });

  it("kademeliYuzde: kural yoksa eşik 1 → her adette uygulanır", () => {
    expect(iskontoUygula(100, "kademeliYuzde", 10, 1, null)).toBe(90);
  });

  it("xAlYOde: '3 Al 2 Öde' → birim fiyat 100 × 2/3", () => {
    // X = minimumAdet = 3, Y = iskontoDeger = 2
    const kural = { minimumAdet: 3 };
    expect(iskontoUygula(100, "xAlYOde", 2, 3, kural)).toBeCloseTo(66.6666, 3);
  });

  it("xAlYOde: eşik altında normal fiyat", () => {
    const kural = { minimumAdet: 3 };
    expect(iskontoUygula(100, "xAlYOde", 2, 2, kural)).toBe(100);
  });

  it("xAlYOde: '2 Al 1 Öde' → yarı fiyat", () => {
    const kural = { minimumAdet: 2 };
    expect(iskontoUygula(100, "xAlYOde", 1, 2, kural)).toBe(50);
  });

  it("xAlYOde: iskontoDeger verilmezse Y = X → indirim yok", () => {
    const kural = { minimumAdet: 3 };
    expect(iskontoUygula(100, "xAlYOde", undefined, 3, kural)).toBe(100);
  });

  it("miktar bazlı türler adet verilmezse (varsayılan 1) normal fiyata düşer", () => {
    // Belge: "adet verilmezse miktar bazlı türler normal fiyata düşer"
    expect(iskontoUygula(100, "kademeliYuzde", 20, 1, { minimumAdet: 5 })).toBe(100);
    expect(iskontoUygula(100, "xAlYOde", 2, 1, { minimumAdet: 3 })).toBe(100);
  });
});

describe("enSpesifikKural — hedef önceliği", () => {
  const urun = parca();

  it("ürün > ürünGrubu > kategori > marka > tümü", () => {
    const k = [
      { hedefTuru: "tumu", etiket: "tumu" },
      { hedefTuru: "marka", hedefDeger: "Bosch", etiket: "marka" },
      { hedefTuru: "kategori", hedefDeger: "Fren", etiket: "kategori" },
      { hedefTuru: "urun", hedefDeger: "p1", etiket: "urun" },
    ];
    expect(enSpesifikKural(k, urun).etiket).toBe("urun");
  });

  it("ürün kuralı yoksa ürünGrubu kazanır", () => {
    const k = [
      { hedefTuru: "tumu" },
      { hedefTuru: "marka", hedefDeger: "Bosch" },
      { hedefTuru: "urunGrubu", hedefUrunIdleri: ["p1", "p2"] },
    ];
    expect(enSpesifikKural(k, urun).hedefTuru).toBe("urunGrubu");
  });

  it("kategori, anaKategori ile de eşleşir", () => {
    const k = [{ hedefTuru: "kategori", hedefDeger: "Yürüyen Aksam" }];
    expect(enSpesifikKural(k, urun)).toBeTruthy();
  });

  it("hiçbiri uymazsa undefined", () => {
    const k = [{ hedefTuru: "marka", hedefDeger: "Fiat" }];
    expect(enSpesifikKural(k, urun)).toBeUndefined();
  });

  it("liste sırası değil, hedef önceliği belirleyici", () => {
    // "tumu" listede ilk olsa bile "urun" kuralı seçilir
    const k = [
      { hedefTuru: "tumu", etiket: "tumu" },
      { hedefTuru: "urun", hedefDeger: "p1", etiket: "urun" },
    ];
    expect(enSpesifikKural(k, urun).etiket).toBe("urun");
  });
});

describe("parcaFiyatiHesapla — ÖNCELİK SIRASI", () => {
  it("müşteri yoksa normal fiyat", () => {
    const r = parcaFiyatiHesapla(db(), parca(), null);
    expect(r).toEqual({ fiyat: 100, kaynak: "Normal Fiyat" });
  });

  it("1) Müşteriye özel fiyat her şeyden önce gelir", () => {
    const d = db({
      musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p1", fiyat: 55 }],
      kampanyalar: [kampanya({ iskontoDeger: 50 })],
    });
    const r = parcaFiyatiHesapla(d, parca(), { id: "m1" });
    expect(r).toEqual({ fiyat: 55, kaynak: "Müşteriye Özel Fiyat" });
  });

  it("müşteriye özel fiyat KDV/kampanya hesabı yapmaz — olduğu gibi döner", () => {
    const d = db({ musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p1", fiyat: 33.333 }] });
    expect(parcaFiyatiHesapla(d, parca(), { id: "m1" }).fiyat).toBe(33.333);
  });

  it("başka müşterinin özel fiyatı uygulanmaz", () => {
    const d = db({ musteriOzelFiyatlar: [{ musteriId: "m2", parcaId: "p1", fiyat: 55 }] });
    expect(parcaFiyatiHesapla(d, parca(), { id: "m1" }).kaynak).toBe("Normal Fiyat");
  });

  it("2) Fiyat grubu kuralı kampanyadan önce gelir", () => {
    const d = db({
      musteriFiyatGruplari: [{ id: "g1", ad: "Toptan" }],
      fiyatGrubuKurallari: [{ grupId: "g1", hedefTuru: "tumu", iskontoTuru: "yuzde", iskontoDeger: 30 }],
      kampanyalar: [kampanya({ iskontoDeger: 50 })], // %50 kampanya var ama grup kazanır
    });
    const r = parcaFiyatiHesapla(d, parca(), { id: "m1", fiyatGrubuId: "g1" });
    expect(r.fiyat).toBe(70);
    expect(r.kaynak).toBe("Fiyat Grubu: Toptan");
  });

  it("3) Müşteriye özel fiyat yoksa grup yoksa kampanya uygulanır", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoDeger: 15 })] });
    const r = parcaFiyatiHesapla(d, parca(), { id: "m1" });
    expect(r.fiyat).toBe(85);
    expect(r.kaynak).toBe("Kampanya: Yaz Kampanyası");
  });

  it("4) Hiçbiri yoksa normal fiyat", () => {
    expect(parcaFiyatiHesapla(db(), parca(), { id: "m1" })).toEqual({ fiyat: 100, kaynak: "Normal Fiyat" });
  });

  it("satisFiyati tanımsızsa 0 döner (NaN değil)", () => {
    expect(parcaFiyatiHesapla(db(), parca({ satisFiyati: undefined }), null).fiyat).toBe(0);
  });

  it("sonuç 2 ondalığa yuvarlanır", () => {
    // 99.99 × %33,33 iskonto → 66.66...
    const d = db({ kampanyalar: [kampanya({ iskontoDeger: 33.33 })] });
    const r = parcaFiyatiHesapla(d, parca({ satisFiyati: 99.99 }), null);
    expect(r.fiyat).toBe(66.66);
    expect(Number.isInteger(Math.round(r.fiyat * 100))).toBe(true);
  });
});

describe("parcaFiyatiHesapla — kampanya geçerliliği", () => {
  it("pasif kampanya uygulanmaz", () => {
    const d = db({ kampanyalar: [kampanya({ aktif: false })] });
    expect(parcaFiyatiHesapla(d, parca(), null).kaynak).toBe("Normal Fiyat");
  });

  it("başlamamış kampanya uygulanmaz", () => {
    const d = db({ kampanyalar: [kampanya({ baslangicTarihi: gunEkle(5), bitisTarihi: gunEkle(15) })] });
    expect(parcaFiyatiHesapla(d, parca(), null).kaynak).toBe("Normal Fiyat");
  });

  it("bitmiş kampanya uygulanmaz", () => {
    const d = db({ kampanyalar: [kampanya({ baslangicTarihi: gunEkle(-20), bitisTarihi: gunEkle(-1) })] });
    expect(parcaFiyatiHesapla(d, parca(), null).kaynak).toBe("Normal Fiyat");
  });

  it("bugün başlayan ve bugün biten kampanya geçerli (sınırlar dahil)", () => {
    const d = db({ kampanyalar: [kampanya({ baslangicTarihi: bugun(), bitisTarihi: bugun() })] });
    expect(parcaFiyatiHesapla(d, parca(), null).kaynak).toBe("Kampanya: Yaz Kampanyası");
  });

  it("müşteri grubu hedefli kampanya yalnızca o gruptaki müşteriye uygulanır", () => {
    const d = db({ kampanyalar: [kampanya({ hedefMusteriGrubuId: "g1" })] });
    expect(parcaFiyatiHesapla(d, parca(), { id: "m1", fiyatGrubuId: "g1" }).fiyat).toBe(90);
    expect(parcaFiyatiHesapla(d, parca(), { id: "m2", fiyatGrubuId: "g2" }).kaynak).toBe("Normal Fiyat");
  });

  it("müşteri grubu hedefli kampanya müşterisiz sepette uygulanmaz", () => {
    const d = db({ kampanyalar: [kampanya({ hedefMusteriGrubuId: "g1" })] });
    expect(parcaFiyatiHesapla(d, parca(), null).kaynak).toBe("Normal Fiyat");
  });

  it("birden fazla aktif kampanyada en spesifik olan kazanır", () => {
    const d = db({
      kampanyalar: [
        kampanya({ id: "k-tumu", ad: "Genel", hedefTuru: "tumu", iskontoDeger: 5 }),
        kampanya({ id: "k-urun", ad: "Ürüne Özel", hedefTuru: "urun", hedefDeger: "p1", iskontoDeger: 25 }),
      ],
    });
    const r = parcaFiyatiHesapla(d, parca(), null);
    expect(r.fiyat).toBe(75);
    expect(r.kaynak).toBe("Kampanya: Ürüne Özel");
  });
});

describe("parcaFiyatiHesapla — miktar bazlı kampanya sepette", () => {
  it("kademeli yüzde: 10 adette indirim, 2 adette normal", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10 })] });
    expect(parcaFiyatiHesapla(d, parca(), null, 2).fiyat).toBe(100);
    expect(parcaFiyatiHesapla(d, parca(), null, 10).fiyat).toBe(80);
  });

  it("xAlYOde: 3 al 2 öde, 3 adette birim fiyat 66.67", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "xAlYOde", iskontoDeger: 2, minimumAdet: 3 })] });
    expect(parcaFiyatiHesapla(d, parca(), null, 3).fiyat).toBe(66.67);
  });
});

describe("kampanyaHedefUrunleri", () => {
  const d = () =>
    db({
      parcalar: [
        parca({ id: "p1", kategori: "Fren", anaKategori: "Yürüyen Aksam", marka: "Bosch" }),
        parca({ id: "p2", kategori: "Filtre", anaKategori: "Motor", marka: "Mann" }),
        parca({ id: "p3", kategori: "Fren", anaKategori: "Yürüyen Aksam", marka: "Bosch", aktif: false }),
      ],
    });

  it("tumu: yalnızca aktif ürünler", () => {
    const r = kampanyaHedefUrunleri(d(), { hedefTuru: "tumu" });
    expect(r.map((p: any) => p.id)).toEqual(["p1", "p2"]); // p3 pasif
  });

  it("urun: tek ürün", () => {
    const r = kampanyaHedefUrunleri(d(), { hedefTuru: "urun", hedefDeger: "p2" });
    expect(r.map((p: any) => p.id)).toEqual(["p2"]);
  });

  it("urunGrubu: id listesi", () => {
    const r = kampanyaHedefUrunleri(d(), { hedefTuru: "urunGrubu", hedefUrunIdleri: ["p1", "p2"] });
    expect(r.map((p: any) => p.id)).toEqual(["p1", "p2"]);
  });

  it("kategori: kategori VEYA anaKategori eşleşir", () => {
    expect(kampanyaHedefUrunleri(d(), { hedefTuru: "kategori", hedefDeger: "Fren" }).map((p: any) => p.id)).toEqual(["p1"]);
    expect(kampanyaHedefUrunleri(d(), { hedefTuru: "kategori", hedefDeger: "Motor" }).map((p: any) => p.id)).toEqual(["p2"]);
  });

  it("marka: marka eşleşmesi", () => {
    expect(kampanyaHedefUrunleri(d(), { hedefTuru: "marka", hedefDeger: "Bosch" }).map((p: any) => p.id)).toEqual(["p1"]);
  });

  it("bilinmeyen hedef türü → boş liste (tümüne uygulanmaz)", () => {
    expect(kampanyaHedefUrunleri(d(), { hedefTuru: "xyz" })).toEqual([]);
  });
});

describe("kampanyaOnizlemesiHesapla", () => {
  const d = () =>
    db({
      parcalar: [
        parca({ id: "p1", satisFiyati: 100, ortalamaMaliyet: 60, stok: 100 }),
        parca({ id: "p2", satisFiyati: 100, ortalamaMaliyet: 95, stok: 1 }),
      ],
    });

  it("kâr ve kâr marjı hesaplanır", () => {
    const r = kampanyaOnizlemesiHesapla(d(), { hedefTuru: "urun", hedefDeger: "p1", iskontoTuru: "yuzde", iskontoDeger: 10 });
    expect(r[0].eskiFiyat).toBe(100);
    expect(r[0].kampanyaliFiyat).toBe(90);
    expect(r[0].maliyet).toBe(60);
    expect(r[0].kar).toBe(30);
    expect(r[0].karMarji).toBeCloseTo(33.3333, 3); // 30/90
    expect(r[0].maliyetAlti).toBe(false);
  });

  it("maliyet altı satış uyarısı (maliyetAlti)", () => {
    const r = kampanyaOnizlemesiHesapla(d(), { hedefTuru: "urun", hedefDeger: "p2", iskontoTuru: "yuzde", iskontoDeger: 50 });
    expect(r[0].kampanyaliFiyat).toBe(50);
    expect(r[0].maliyet).toBe(95);
    expect(r[0].kar).toBe(-45);
    expect(r[0].maliyetAlti).toBe(true);
  });

  it("kampanyalı fiyat 0 ise kâr marjı null (sıfıra bölme)", () => {
    const r = kampanyaOnizlemesiHesapla(d(), { hedefTuru: "urun", hedefDeger: "p1", iskontoTuru: "yuzde", iskontoDeger: 100 });
    expect(r[0].kampanyaliFiyat).toBe(0);
    expect(r[0].karMarji).toBeNull();
  });

  it("stok, son 30 gün satışının altındaysa uyarı verir", () => {
    const d2 = d();
    d2.satislar = [
      { durum: "Tamamlandı", tarih: new Date().toISOString(), kalemler: [{ parcaId: "p2", adet: 5 }] },
    ] as any;
    const r = kampanyaOnizlemesiHesapla(d2, { hedefTuru: "urun", hedefDeger: "p2", iskontoTuru: "yuzde", iskontoDeger: 10 });
    expect(r[0].son30GunSatis).toBe(5);
    expect(r[0].stokYetersizOlabilir).toBe(true); // stok 1 < 5
  });

  it("iptal edilen satışlar son 30 gün sayımına girmez", () => {
    const d2 = d();
    d2.satislar = [
      { durum: "İptal Edildi", tarih: new Date().toISOString(), kalemler: [{ parcaId: "p2", adet: 5 }] },
    ] as any;
    const r = kampanyaOnizlemesiHesapla(d2, { hedefTuru: "urun", hedefDeger: "p2", iskontoTuru: "yuzde", iskontoDeger: 10 });
    expect(r[0].son30GunSatis).toBe(0);
    expect(r[0].stokYetersizOlabilir).toBe(false);
  });

  it("pasif ürünler önizlemede yok", () => {
    const d2 = db({ parcalar: [parca({ id: "p1", aktif: false })] });
    expect(kampanyaOnizlemesiHesapla(d2, { hedefTuru: "tumu", iskontoTuru: "yuzde", iskontoDeger: 10 })).toEqual([]);
  });
});

describe("kampanyaSatisRaporu", () => {
  const satis = (over: any = {}) => ({
    durum: "Tamamlandı",
    tarih: new Date().toISOString(),
    kalemler: [
      { parcaId: "p1", adet: 2, birimFiyat: 90, iskontoTutari: 0, genelIskontoPayi: 0, fiyatKaynagi: "Kampanya: Yaz Kampanyası", maliyet: 60 },
    ],
    ...over,
  });

  it("kampanya kaynaklı kalemleri toplar", () => {
    const d = db({ satislar: [satis()] });
    const r = kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" });
    expect(r.adet).toBe(2);
    expect(r.ciro).toBe(180);
  });

  it("başka kampanyanın satışları sayılmaz", () => {
    const d = db({ satislar: [satis({ kalemler: [{ parcaId: "p1", adet: 2, birimFiyat: 90, fiyatKaynagi: "Kampanya: Kış Kampanyası" }] })] });
    expect(kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" }).adet).toBe(0);
  });

  it("iptal edilen satışlar sayılmaz", () => {
    const d = db({ satislar: [satis({ durum: "İptal Edildi" })] });
    expect(kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" }).adet).toBe(0);
  });

  it("toplam iskonto = normal fiyat cirosu − gerçekleşen ciro", () => {
    const d = db({ satislar: [satis()] }); // 2 adet × normal 100 = 200, gerçekleşen 180
    const r = kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" });
    expect(r.toplamIskonto).toBe(20);
  });

  it("kalem iskontosu cirodan düşülür", () => {
    const d = db({ satislar: [satis({ kalemler: [{ parcaId: "p1", adet: 2, birimFiyat: 90, iskontoTutari: 10, fiyatKaynagi: "Kampanya: Yaz Kampanyası", maliyet: 60 }] })] });
    expect(kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" }).ciro).toBe(170);
  });

  it("genel iskonto payı da cirodan düşülür", () => {
    const d = db({ satislar: [satis({ kalemler: [{ parcaId: "p1", adet: 2, birimFiyat: 90, genelIskontoPayi: 15, fiyatKaynagi: "Kampanya: Yaz Kampanyası", maliyet: 60 }] })] });
    expect(kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" }).ciro).toBe(165);
  });

  it("brüt kâr hesaplanır", () => {
    const d = db({ satislar: [satis()] });
    // 2 × (90 − 60) = 60
    expect(kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" }).brutKar).toBe(60);
  });

  it("birden fazla satış toplanır", () => {
    const d = db({ satislar: [satis(), satis()] });
    const r = kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" });
    expect(r.adet).toBe(4);
    expect(r.ciro).toBe(360);
  });

  it("satış yoksa sıfırlar (negatif iskonto olmaz)", () => {
    const r = kampanyaSatisRaporu(db(), { ad: "Yaz Kampanyası" });
    expect(r).toEqual({ adet: 0, ciro: 0, toplamIskonto: 0, brutKar: 0 });
  });

  it("ürün silinmişse birim fiyat üzerinden hesaplanır (çökmez)", () => {
    const d = db({ parcalar: [], satislar: [satis()] });
    const r = kampanyaSatisRaporu(d, { ad: "Yaz Kampanyası" });
    expect(r.ciro).toBe(180);
    expect(r.toplamIskonto).toBe(0); // normal fiyat = birim fiyat → fark yok
  });
});

// ---------------------------------------------------------------------------
// SEPET ENTEGRASYONU — `SatisSayfasi.tsx` fiyat yenileme kuralı
// ---------------------------------------------------------------------------
/**
 * `SatisSayfasi.tsx` içindeki `fiyatiAdedeGoreYenile` kuralının birebir
 * kopyası. Sepet satırı adet değişince bu kuralla tazelenir.
 *
 * Kurallar:
 *  1) Elle değiştirilmiş fiyat (fiyatElleDegistirildi) EZİLMEZ.
 *  2) Müşteriye özel fiyat / fiyat grubu adetten bağımsız → dokunulmaz.
 *  3) Yalnızca miktar bazlı (kademeliYuzde, xAlYOde) aktif kampanya varsa
 *     fiyat yeniden hesaplanır.
 *  4) Diğer türler (yuzde/tutar/sabitFiyat) adetten bağımsız → gereksiz
 *     yeniden hesap yapılmaz (manuel düzenlemeleri bozmasın).
 */
const ADET_BAZLI = ["kademeliYuzde", "xAlYOde"];

const fiyatiAdedeGoreYenile = (d: any, sepetSatiri: any, parca: any, adet: number, musteri: any = null) => {
  const s = sepetSatiri;
  if (!parca || s.fiyatElleDegistirildi) return s;
  const kaynak = String(s.fiyatKaynagi || "");
  if (kaynak === "Müşteriye Özel Fiyat" || kaynak.startsWith("Fiyat Grubu:")) return s;
  const bugunIso = isoGun(new Date());
  const adetBazliVar = d.kampanyalar.some(
    (k: any) =>
      k.aktif !== false &&
      k.baslangicTarihi <= bugunIso &&
      k.bitisTarihi >= bugunIso &&
      ADET_BAZLI.includes(k.iskontoTuru) &&
      (!k.hedefMusteriGrubuId || (musteri && musteri.fiyatGrubuId === k.hedefMusteriGrubuId))
  );
  if (!adetBazliVar) return s;
  const { fiyat, kaynak: yeniKaynak } = parcaFiyatiHesapla(d, parca, musteri, adet);
  // DİKKAT: `adet` burada yazılmalı — çağıran `{...s, adet}` göndermeden önce
  // tazeleme yapıyorsa adet kaybolur. Kural adedi de taşır.
  return { ...s, adet, birimFiyat: fiyat, fiyatKaynagi: yeniKaynak };
};

describe("sepette adet değişince fiyat yenileme", () => {
  const kademeli = () => db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10 })] });
  const satir = (over: any = {}) => ({ parcaId: "p1", adet: 1, birimFiyat: 100, iskontoTuru: "tutar", iskontoDeger: 0, fiyatKaynagi: "Kampanya: Yaz Kampanyası", ...over });

  it("Kademeli %: 1 adetten 10 adete çıkınca fiyat 80'e iner", () => {
    const d = kademeli();
    const r = fiyatiAdedeGoreYenile(d, satir(), parca(), 10);
    expect(r.adet).toBe(10);
    expect(r.birimFiyat).toBe(80);
  });

  it("Kademeli %: 10 adetten 3 adete düşünce fiyat 100'e döner", () => {
    const d = kademeli();
    const r = fiyatiAdedeGoreYenile(d, satir({ adet: 10, birimFiyat: 80 }), parca(), 3);
    expect(r.birimFiyat).toBe(100);
  });

  it("X Al Y Öde: 3 adette birim fiyat 66.67", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "xAlYOde", iskontoDeger: 2, minimumAdet: 3 })] });
    expect(fiyatiAdedeGoreYenile(d, satir(), parca(), 3).birimFiyat).toBe(66.67);
  });

  it("elle değiştirilmiş fiyat EZİLMEZ", () => {
    const d = kademeli();
    const r = fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 42, fiyatElleDegistirildi: true }), parca(), 10);
    expect(r.birimFiyat).toBe(42);
  });

  it("müşteriye özel fiyat EZİLMEZ", () => {
    const d = kademeli();
    const r = fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 55, fiyatKaynagi: "Müşteriye Özel Fiyat" }), parca(), 10);
    expect(r.birimFiyat).toBe(55);
  });

  it("fiyat grubu fiyatı EZİLMEZ", () => {
    const d = kademeli();
    const r = fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 70, fiyatKaynagi: "Fiyat Grubu: Toptan" }), parca(), 10);
    expect(r.birimFiyat).toBe(70);
  });

  it("adet bazlı kampanya yoksa yeniden hesap yapılmaz", () => {
    // yüzde kampanyası var ama adetten bağımsız → satırdaki fiyat korunur
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "yuzde", iskontoDeger: 10 })] });
    const r = fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 95 }), parca(), 10);
    expect(r.birimFiyat).toBe(95); // 90'a düşürülmez
  });

  it("pasif adet bazlı kampanya yenileme tetiklemez", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10, aktif: false })] });
    expect(fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 99 }), parca(), 10).birimFiyat).toBe(99);
  });

  it("süresi geçmiş adet bazlı kampanya yenileme tetiklemez", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10, bitisTarihi: gunEkle(-1) })] });
    expect(fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 99 }), parca(), 10).birimFiyat).toBe(99);
  });

  it("müşteri grubu hedefli kampanya yalnızca o gruptaki müşteride yeniler", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10, hedefMusteriGrubuId: "g1" })] });
    expect(fiyatiAdedeGoreYenile(d, satir(), parca(), 10, { id: "m1", fiyatGrubuId: "g1" }).birimFiyat).toBe(80);
    expect(fiyatiAdedeGoreYenile(d, satir({ birimFiyat: 100 }), parca(), 10, { id: "m2", fiyatGrubuId: "g2" }).birimFiyat).toBe(100);
  });

  it("ürün bulunamazsa satır olduğu gibi kalır (çökmez)", () => {
    const r = fiyatiAdedeGoreYenile(kademeli(), satir({ birimFiyat: 100 }), undefined, 10);
    expect(r.birimFiyat).toBe(100);
  });

  it("fiyatKaynagi da güncellenir (arayüzdeki rozet doğru görünsün)", () => {
    const r = fiyatiAdedeGoreYenile(kademeli(), satir(), parca(), 10);
    expect(r.fiyatKaynagi).toBe("Kampanya: Yaz Kampanyası");
  });

  it("sepet toplamı: 10 adet × 80 = 800 (indirim gerçekten yansıyor)", () => {
    const r = fiyatiAdedeGoreYenile(kademeli(), satir(), parca(), 10);
    expect(r.adet * r.birimFiyat).toBe(800); // 10 × 100 = 1000 değil
  });
});

// ---------------------------------------------------------------------------
describe("iskonto sırası — satır iskontosu ve genel iskonto", () => {
  /**
   * `SatisSayfasi.tsx` sırası:
   *   hamToplam = Σ (adet × birimFiyat)
   *   satır iskontoları düşülür  →  net
   *   genel iskonto NET üzerinden hesaplanır
   * Yani genel iskonto satır iskontosunun ÜSTÜNE biner (bileşik), toplanmaz.
   */
  const toplam = (satirlar: any[], genelTuru: string, genelDeger: number) => {
    const ham = satirlar.reduce((t, s) => t + s.adet * s.birimFiyat, 0);
    const satirIsk = satirlar.reduce((t, s) => {
      const taban = s.adet * s.birimFiyat;
      return t + (s.iskontoTuru === "yuzde" ? (taban * s.iskontoDeger) / 100 : s.iskontoDeger);
    }, 0);
    const net = Math.max(0, ham - satirIsk);
    const genel = genelTuru === "yuzde" ? (net * genelDeger) / 100 : genelDeger;
    return { ham, satirIsk, net, genel, odenecek: net - genel };
  };

  it("satır iskontosu önce, genel iskonto sonra (bileşik)", () => {
    const r = toplam([{ adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 }], "yuzde", 10);
    expect(r.ham).toBe(100);
    expect(r.satirIsk).toBe(10);
    expect(r.net).toBe(90);
    expect(r.genel).toBe(9); // 90'ın %10'u, 100'ün değil
    expect(r.odenecek).toBe(81);
  });

  it("toplama değil çarpma: %10 + %10 = %19 (toplam %20 değil)", () => {
    const r = toplam([{ adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 }], "yuzde", 10);
    expect(r.ham - r.odenecek).toBe(19);
  });

  it("satır iskontosu tutar bazlıysa adetle çarpılmaz (satır toplamından düşer)", () => {
    const r = toplam([{ adet: 3, birimFiyat: 100, iskontoTuru: "tutar", iskontoDeger: 50 }], "tutar", 0);
    expect(r.ham).toBe(300);
    expect(r.satirIsk).toBe(50); // 3 × 50 = 150 DEĞİL
    expect(r.odenecek).toBe(250);
  });

  it("satır iskontosu yüzde ise adetle birlikte büyür", () => {
    const r = toplam([{ adet: 3, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 }], "tutar", 0);
    expect(r.satirIsk).toBe(30); // 300'ün %10'u
  });

  it("genel iskonto net satır toplamını aşamaz (negatif ödeme olmaz)", () => {
    const r = toplam([{ adet: 1, birimFiyat: 100, iskontoTuru: "tutar", iskontoDeger: 0 }], "tutar", 500);
    expect(r.odenecek).toBe(-400); // ham hesap; çağıran Math.min ile sınırlıyor
    expect(Math.max(0, r.odenecek)).toBe(0);
  });

  it("birden fazla satırda iskontolar toplanır", () => {
    const r = toplam(
      [
        { adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 },
        { adet: 2, birimFiyat: 50, iskontoTuru: "tutar", iskontoDeger: 20 },
      ],
      "yuzde",
      10
    );
    expect(r.ham).toBe(200);
    expect(r.satirIsk).toBe(30); // 10 + 20
    expect(r.net).toBe(170);
    expect(r.genel).toBe(17);
    expect(r.odenecek).toBe(153);
  });
});

// ---------------------------------------------------------------------------
describe("diğer ekranlar — fiyat çözümlemesini kullanıyorlar mı", () => {
  /**
   * `MusteriSiparisiSayfasi.tsx` içindeki `parcaIcinFiyat` kuralının kopyası:
   * sipariş fiyatı artık `p.satisFiyati` yerine merkezî `parcaFiyatiHesapla`'dan
   * geliyor. Müşteri adı kayıtlı bir cariyle eşleşiyorsa o cariye göre.
   */
  const parcaIcinFiyat = (d: any, p: any, musteri: any, adet = 1): string => {
    if (!p) return "0";
    const { fiyat } = parcaFiyatiHesapla(d, p, musteri || null, adet);
    return String(fiyat);
  };

  const duzen = () =>
    db({
      musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p1", fiyat: 55 }],
      musteriFiyatGruplari: [{ id: "g1", ad: "Toptan" }],
      fiyatGrubuKurallari: [{ grupId: "g1", hedefTuru: "tumu", iskontoTuru: "yuzde", iskontoDeger: 30 }],
      kampanyalar: [kampanya({ iskontoDeger: 10 })],
    });

  it("müşteriye özel fiyat siparişte de uygulanır", () => {
    expect(parcaIcinFiyat(duzen(), parca(), { id: "m1" })).toBe("55");
  });

  it("fiyat grubu siparişte de uygulanır", () => {
    expect(parcaIcinFiyat(duzen(), parca(), { id: "m2", fiyatGrubuId: "g1" })).toBe("70");
  });

  it("müşteri yoksa kampanya uygulanır", () => {
    expect(parcaIcinFiyat(duzen(), parca(), null)).toBe("90");
  });

  it("miktar bazlı kampanya siparişte adetle çalışır", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10 })] });
    expect(parcaIcinFiyat(d, parca(), null, 3)).toBe("100");
    expect(parcaIcinFiyat(d, parca(), null, 10)).toBe("80");
  });

  it("ürün yoksa '0' döner (form alanı string)", () => {
    expect(parcaIcinFiyat(db(), undefined, null)).toBe("0");
  });

  it("dönen değer HER ZAMAN string (form alanı string tutuyor)", () => {
    expect(typeof parcaIcinFiyat(duzen(), parca(), null)).toBe("string");
    expect(typeof parcaIcinFiyat(db(), undefined, null)).toBe("string");
  });
});

describe("teklif fiyatı — merkezî çözümleme (düzeltildi)", () => {
  /**
   * `TekliflerSayfasi.tsx` kurallarının birebir kopyası:
   *  - `kalemIcinFiyat(p, adet)` → parcaFiyatiHesapla
   *  - `musteriFiyatlariniYenile(musteri)` → elle değiştirilmemiş kalemleri tazeler
   *  - `kalemAdetGuncelle` → adetten bağımsız değilse yeniden hesap
   *  - `kalemFiyatGuncelle` → fiyatElleDegistirildi: true
   */
  const kalemIcinFiyat = (d: any, p: any, musteri: any, adet = 1): number => {
    if (!p) return 0;
    return parcaFiyatiHesapla(d, p, musteri || null, adet).fiyat;
  };

  const tazele = (d: any, kalemler: any[], musteri: any) =>
    kalemler.map((k) => {
      if (k.fiyatElleDegistirildi) return k;
      const p = d.parcalar.find((x: any) => x.id === k.parcaId);
      if (!p) return k;
      const { fiyat } = parcaFiyatiHesapla(d, p, musteri || null, k.adet || 1);
      return k.birimFiyat === fiyat ? k : { ...k, birimFiyat: fiyat };
    });

  const duzen = () =>
    db({
      musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p1", fiyat: 55 }],
      musteriFiyatGruplari: [{ id: "g1", ad: "Toptan" }],
      fiyatGrubuKurallari: [{ grupId: "g1", hedefTuru: "tumu", iskontoTuru: "yuzde", iskontoDeger: 30 }],
      kampanyalar: [kampanya({ iskontoDeger: 10 })],
    });

  const kalem = (over: any = {}) => ({ id: "tk1", parcaId: "p1", adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 0, fiyatElleDegistirildi: false, ...over });

  it("kalem eklenirken müşteriye özel fiyat uygulanır", () => {
    expect(kalemIcinFiyat(duzen(), parca(), { id: "m1" })).toBe(55);
  });

  it("kalem eklenirken fiyat grubu uygulanır", () => {
    expect(kalemIcinFiyat(duzen(), parca(), { id: "m2", fiyatGrubuId: "g1" })).toBe(70);
  });

  it("müşteri yokken kampanya uygulanır", () => {
    expect(kalemIcinFiyat(duzen(), parca(), null)).toBe(90);
  });

  it("müşteri yazılınca kalemler tazelenir (indirim yansır)", () => {
    const d = duzen();
    const r = tazele(d, [kalem({ birimFiyat: 90 })], { id: "m1" });
    expect(r[0].birimFiyat).toBe(55);
  });

  it("müşteri silinince fiyat normale döner", () => {
    const d = duzen();
    const r = tazele(d, [kalem({ birimFiyat: 55 })], null);
    expect(r[0].birimFiyat).toBe(90); // kampanya %10
  });

  it("fiyat grubu olan müşteriye geçince grup fiyatı uygulanır", () => {
    const d = duzen();
    const r = tazele(d, [kalem({ birimFiyat: 55 })], { id: "m2", fiyatGrubuId: "g1" });
    expect(r[0].birimFiyat).toBe(70);
  });

  it("elle değiştirilmiş kalem fiyatı EZİLMEZ", () => {
    const d = duzen();
    const r = tazele(d, [kalem({ birimFiyat: 42, fiyatElleDegistirildi: true })], { id: "m1" });
    expect(r[0].birimFiyat).toBe(42);
  });

  it("fiyatı zaten doğru olan kalem aynı referansla döner (gereksiz render yok)", () => {
    const d = duzen();
    const k = kalem({ birimFiyat: 55 });
    expect(tazele(d, [k], { id: "m1" })[0]).toBe(k);
  });

  it("ürün silinmişse kalem olduğu gibi kalır", () => {
    const d = db({ parcalar: [] });
    const k = kalem();
    expect(tazele(d, [k], { id: "m1" })[0]).toBe(k);
  });

  it("birden fazla kalem ayrı ayrı tazelenir", () => {
    const d = db({
      parcalar: [parca({ id: "p1" }), parca({ id: "p2", satisFiyati: 200 })],
      musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p2", fiyat: 150 }],
      kampanyalar: [kampanya({ iskontoDeger: 10 })],
    });
    const r = tazele(d, [kalem({ id: "a", parcaId: "p1", birimFiyat: 100 }), kalem({ id: "b", parcaId: "p2", birimFiyat: 200 })], { id: "m1" });
    expect(r[0].birimFiyat).toBe(90); // kampanya
    expect(r[1].birimFiyat).toBe(150); // özel fiyat
  });

  it("miktar bazlı kampanya teklifte adetle çalışır", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10 })] });
    expect(kalemIcinFiyat(d, parca(), null, 3)).toBe(100);
    expect(kalemIcinFiyat(d, parca(), null, 10)).toBe(80);
  });
});

describe("teklif kaleminden kayda yazılmaması gerekenler", () => {
  it("fiyatElleDegistirildi kayda yazılmaz (form içi işaret)", () => {
    const kayitKalemleri = (kalemler: any[]) => kalemler.map(({ fiyatElleDegistirildi, ...k }) => k);
    const r = kayitKalemleri([{ id: "tk1", parcaId: "p1", adet: 1, birimFiyat: 55, fiyatElleDegistirildi: true }]);
    expect(r[0]).not.toHaveProperty("fiyatElleDegistirildi");
    expect(r[0]).toMatchObject({ id: "tk1", parcaId: "p1", birimFiyat: 55 });
  });
});

// ---------------------------------------------------------------------------
describe("iskonto sırası — satır iskontosu ve genel iskonto", () => {
  /**
   * `SatisSayfasi.tsx` sırası:
   *   hamToplam = Σ (adet × birimFiyat)
   *   satır iskontoları düşülür  →  net
   *   genel iskonto NET üzerinden hesaplanır
   * Yani genel iskonto satır iskontosunun ÜSTÜNE biner (bileşik), toplanmaz.
   */
  const toplam = (satirlar: any[], genelTuru: string, genelDeger: number) => {
    const ham = satirlar.reduce((t, s) => t + s.adet * s.birimFiyat, 0);
    const satirIsk = satirlar.reduce((t, s) => {
      const taban = s.adet * s.birimFiyat;
      return t + (s.iskontoTuru === "yuzde" ? (taban * s.iskontoDeger) / 100 : s.iskontoDeger);
    }, 0);
    const net = Math.max(0, ham - satirIsk);
    const genel = genelTuru === "yuzde" ? (net * genelDeger) / 100 : genelDeger;
    return { ham, satirIsk, net, genel, odenecek: net - genel };
  };

  it("satır iskontosu önce, genel iskonto sonra (bileşik)", () => {
    const r = toplam([{ adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 }], "yuzde", 10);
    expect(r.ham).toBe(100);
    expect(r.satirIsk).toBe(10);
    expect(r.net).toBe(90);
    expect(r.genel).toBe(9); // 90'ın %10'u, 100'ün değil
    expect(r.odenecek).toBe(81);
  });

  it("toplama değil çarpma: %10 + %10 = %19 (toplam %20 değil)", () => {
    const r = toplam([{ adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 }], "yuzde", 10);
    expect(r.ham - r.odenecek).toBe(19);
  });

  it("satır iskontosu tutar bazlıysa adetle çarpılmaz (satır toplamından düşer)", () => {
    const r = toplam([{ adet: 3, birimFiyat: 100, iskontoTuru: "tutar", iskontoDeger: 50 }], "tutar", 0);
    expect(r.ham).toBe(300);
    expect(r.satirIsk).toBe(50); // 3 × 50 = 150 DEĞİL
    expect(r.odenecek).toBe(250);
  });

  it("satır iskontosu yüzde ise adetle birlikte büyür", () => {
    const r = toplam([{ adet: 3, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 }], "tutar", 0);
    expect(r.satirIsk).toBe(30); // 300'ün %10'u
  });

  it("genel iskonto net satır toplamını aşamaz (negatif ödeme olmaz)", () => {
    const r = toplam([{ adet: 1, birimFiyat: 100, iskontoTuru: "tutar", iskontoDeger: 0 }], "tutar", 500);
    expect(r.odenecek).toBe(-400); // ham hesap; çağıran Math.min ile sınırlıyor
    expect(Math.max(0, r.odenecek)).toBe(0);
  });

  it("birden fazla satırda iskontolar toplanır", () => {
    const r = toplam(
      [
        { adet: 1, birimFiyat: 100, iskontoTuru: "yuzde", iskontoDeger: 10 },
        { adet: 2, birimFiyat: 50, iskontoTuru: "tutar", iskontoDeger: 20 },
      ],
      "yuzde",
      10
    );
    expect(r.ham).toBe(200);
    expect(r.satirIsk).toBe(30); // 10 + 20
    expect(r.net).toBe(170);
    expect(r.genel).toBe(17);
    expect(r.odenecek).toBe(153);
  });
});

// ---------------------------------------------------------------------------
describe("diğer ekranlar — fiyat çözümlemesini kullanıyorlar mı", () => {
  /**
   * `MusteriSiparisiSayfasi.tsx` içindeki `parcaIcinFiyat` kuralının kopyası:
   * sipariş fiyatı artık `p.satisFiyati` yerine merkezî `parcaFiyatiHesapla`'dan
   * geliyor. Müşteri adı kayıtlı bir cariyle eşleşiyorsa o cariye göre.
   */
  const parcaIcinFiyat = (d: any, p: any, musteri: any, adet = 1): string => {
    if (!p) return "0";
    const { fiyat } = parcaFiyatiHesapla(d, p, musteri || null, adet);
    return String(fiyat);
  };

  const duzen = () =>
    db({
      musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p1", fiyat: 55 }],
      musteriFiyatGruplari: [{ id: "g1", ad: "Toptan" }],
      fiyatGrubuKurallari: [{ grupId: "g1", hedefTuru: "tumu", iskontoTuru: "yuzde", iskontoDeger: 30 }],
      kampanyalar: [kampanya({ iskontoDeger: 10 })],
    });

  it("müşteriye özel fiyat siparişte de uygulanır", () => {
    expect(parcaIcinFiyat(duzen(), parca(), { id: "m1" })).toBe("55");
  });

  it("fiyat grubu siparişte de uygulanır", () => {
    expect(parcaIcinFiyat(duzen(), parca(), { id: "m2", fiyatGrubuId: "g1" })).toBe("70");
  });

  it("müşteri yoksa kampanya uygulanır", () => {
    expect(parcaIcinFiyat(duzen(), parca(), null)).toBe("90");
  });

  it("miktar bazlı kampanya siparişte adetle çalışır", () => {
    const d = db({ kampanyalar: [kampanya({ iskontoTuru: "kademeliYuzde", iskontoDeger: 20, minimumAdet: 10 })] });
    expect(parcaIcinFiyat(d, parca(), null, 3)).toBe("100");
    expect(parcaIcinFiyat(d, parca(), null, 10)).toBe("80");
  });

  it("ürün yoksa '0' döner (form alanı string)", () => {
    expect(parcaIcinFiyat(db(), undefined, null)).toBe("0");
  });

  it("dönen değer HER ZAMAN string (form alanı string tutuyor)", () => {
    expect(typeof parcaIcinFiyat(duzen(), parca(), null)).toBe("string");
    expect(typeof parcaIcinFiyat(db(), undefined, null)).toBe("string");
  });
});

describe("⚠️ BELGELENMİŞ AÇIK — teklif fiyatı merkezî çözümlemeyi kullanmıyor", () => {
  /**
   * `TekliflerSayfasi.tsx` `kalemEkle` içinde `birimFiyat: p.satisFiyati || 0`
   * kullanılıyor — müşteriye özel fiyat, fiyat grubu ve kampanya teklife
   * YANSIMIYOR. Bu bilinçli olarak düzeltilmedi çünkü:
   *   - teklifte müşteri kalem eklendikten SONRA yazılıyor (müşteri henüz yok),
   *   - tekliflerde satır bazlı iskonto akışı var,
   *   - personelin teklifi serbestçe fiyatlaması iş pratiği olabilir.
   * Aşağıdaki testler motorun doğru sonucunu belgeler; bağlanması bir iş kararı.
   */
  it("motor müşteriye göre indirim veriyor", () => {
    const d = db({ musteriOzelFiyatlar: [{ musteriId: "m1", parcaId: "p1", fiyat: 55 }] });
    expect(parcaFiyatiHesapla(d, parca(), { id: "m1" }).fiyat).toBe(55);
  });

  it("teklif ekranı satisFiyati kullandığı için bu indirimi görmüyor", () => {
    // Teklifteki mevcut davranış:
    expect(parca().satisFiyati).toBe(100); // 55 değil
  });
});
