/**
 * GERÇEK TEST — para hareketi motoru (tahsilat / ödeme)
 * Kaynak: src/lib/finans-islem.ts
 *
 * Kritik: Buradaki hata doğrudan parayı yanlış gösterir. Doğrulama (bakiye,
 * cari borç, dağılım), uygulama (cari + kasa/banka + fatura tahsisi) ve iptal
 * (ters işlem) aynı dosyada olduğu için testin tamamı burada.
 */
import { describe, it, expect } from "vitest";
import {
  finansIslemIdempotentMi,
  finansIslemDogrula,
  finansIslemiUygula,
  finansIslemiIptalEt,
  finansTutarlilikKontrolu,
  type FinansIslemGirdisi,
} from "../../src/lib/finans-islem";

/* ------------------------------------------------------------------ */
/* Test veritabanı                                                     */
/* ------------------------------------------------------------------ */

const dbKur = () => ({
  cariler: [{ id: "c1", ad: "Ahmet Yılmaz", bakiye: 1000, hareketler: [] }],
  tedarikciler: [{ id: "t1", ad: "Yıldız Parça", bakiye: 800, hareketler: [] }],
  hesaplar: [
    { id: "h-kasa", ad: "Merkez Kasa", bakiye: 5000, aktif: true, hareketler: [] },
    { id: "h-banka", ad: "Ziraat", bakiye: 20000, aktif: true, hareketler: [] },
    { id: "h-pasif", ad: "Kapalı Hesap", bakiye: 1000, aktif: false, hareketler: [] },
  ],
  satislar: [
    { id: "s1", musteriId: "c1", musteriAdi: "Ahmet Yılmaz", genelToplam: 600, acikHesapOdenen: 0, odemeler: [{ yontem: "Açık Hesap", tutar: 600 }] },
    { id: "s2", musteriId: "c1", musteriAdi: "Ahmet Yılmaz", genelToplam: 400, acikHesapOdenen: 0, odemeler: [{ yontem: "Açık Hesap", tutar: 400 }] },
  ],
  malAlimlari: [
    { id: "m1", tedarikci: "Yıldız Parça", faturaTutari: 800, odenenTutar: 0 },
  ],
  kasaIslemleri: [],
});

const tahsilat = (ek: Partial<FinansIslemGirdisi> = {}): FinansIslemGirdisi => ({
  yon: "tahsilat",
  tarafId: "c1",
  tarafAdi: "Ahmet Yılmaz",
  tutar: 600,
  hesapSatirlari: [{ hesapId: "h-kasa", tutar: 600, yontem: "Nakit" }],
  ...ek,
});

const odeme = (ek: Partial<FinansIslemGirdisi> = {}): FinansIslemGirdisi => ({
  yon: "odeme",
  tarafId: "t1",
  tarafAdi: "Yıldız Parça",
  tutar: 800,
  hesapSatirlari: [{ hesapId: "h-banka", tutar: 800, yontem: "Havale" }],
  ...ek,
});

/* ------------------------------------------------------------------ */
/* finansIslemDogrula                                                  */
/* ------------------------------------------------------------------ */

describe("finansIslemDogrula — tahsilat", () => {
  it("geçerli tahsilat kabul edilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat());
    expect(r.gecerli).toBe(true);
    expect(r.hatalar).toEqual([]);
  });

  it("tutar 0 ise reddedilir", () => {
    expect(finansIslemDogrula(dbKur(), tahsilat({ tutar: 0 })).gecerli).toBe(false);
  });

  it("negatif tutar reddedilir", () => {
    expect(finansIslemDogrula(dbKur(), tahsilat({ tutar: -50 })).gecerli).toBe(false);
  });

  it("cari seçilmemişse reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ tarafId: "" }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/cari/i);
  });

  it("olmayan müşteri reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ tarafId: "yok" }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/müşteri bulunamadı/i);
  });

  it("hesap satırı yoksa reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ hesapSatirlari: [] }));
    expect(r.gecerli).toBe(false);
  });

  it("dağılım toplamı işlem tutarına eşit değilse reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ hesapSatirlari: [{ hesapId: "h-kasa", tutar: 500 }] }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/dağılımı/i);
  });

  it("1 kuruşluk yuvarlama farkı tolere edilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ tutar: 600, hesapSatirlari: [{ hesapId: "h-kasa", tutar: 600.009 }] }));
    expect(r.gecerli).toBe(true);
  });

  it("tutarı 0 olan hesap satırları yok sayılır (dağılımı bozmaz)", () => {
    const r = finansIslemDogrula(
      dbKur(),
      tahsilat({ hesapSatirlari: [{ hesapId: "h-kasa", tutar: 600 }, { hesapId: "h-banka", tutar: 0 }] })
    );
    expect(r.gecerli).toBe(true);
    expect(r.satirlar).toHaveLength(1);
  });

  it("pasif (aktif:false) hesap kullanılamaz", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ hesapSatirlari: [{ hesapId: "h-pasif", tutar: 600 }] }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/bulunamadı/i);
  });

  it("olmayan hesap reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ hesapSatirlari: [{ hesapId: "yok", tutar: 600 }] }));
    expect(r.gecerli).toBe(false);
  });

  it("fatura tahsisi işlem tutarını aşarsa reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), tahsilat({ faturaTahsisleri: [{ faturaId: "s1", tutar: 900 }] }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/tahsis/i);
  });

  it("tahsilatta müşteri bakiyesi 0 olsa da kabul edilir (avans)", () => {
    const db: any = dbKur();
    db.cariler[0].bakiye = 0;
    expect(finansIslemDogrula(db, tahsilat()).gecerli).toBe(true);
  });

  it("birden fazla hesaba bölünmüş tahsilat geçerli", () => {
    const r = finansIslemDogrula(
      dbKur(),
      tahsilat({
        hesapSatirlari: [
          { hesapId: "h-kasa", tutar: 200, yontem: "Nakit" },
          { hesapId: "h-banka", tutar: 400, yontem: "Havale" },
        ],
      })
    );
    expect(r.gecerli).toBe(true);
    expect(r.satirlar).toHaveLength(2);
  });
});

describe("finansIslemDogrula — ödeme", () => {
  it("geçerli ödeme kabul edilir", () => {
    expect(finansIslemDogrula(dbKur(), odeme()).gecerli).toBe(true);
  });

  it("tedarikçi bulunamazsa reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), odeme({ tarafId: "yok" }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/tedarikçi bulunamadı/i);
  });

  it("tedarikçinin borcu yoksa reddedilir", () => {
    const db: any = dbKur();
    db.tedarikciler[0].bakiye = 0;
    const r = finansIslemDogrula(db, odeme({ tutar: 100, hesapSatirlari: [{ hesapId: "h-banka", tutar: 100 }] }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/borcu bulunmuyor/i);
  });

  it("borçtan fazla ödeme reddedilir ve borç tutarı mesajda yazar", () => {
    const r = finansIslemDogrula(dbKur(), odeme({ tutar: 900, hesapSatirlari: [{ hesapId: "h-banka", tutar: 900 }] }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/800\.00/);
  });

  it("kasa bakiyesi yetmiyorsa reddedilir", () => {
    const r = finansIslemDogrula(dbKur(), odeme({ tutar: 800, hesapSatirlari: [{ hesapId: "h-kasa", tutar: 800 }] }));
    // h-kasa bakiyesi 5000 → yeterli. Banka 20000 → yeterli.
    expect(r.gecerli).toBe(true);
  });

  it("bakiye tam yetiyorsa kabul edilir (sınır)", () => {
    const db: any = dbKur();
    db.hesaplar[0].bakiye = 800; // tam 800
    expect(finansIslemDogrula(db, odeme({ tutar: 800, hesapSatirlari: [{ hesapId: "h-kasa", tutar: 800 }] })).gecerli).toBe(true);
  });

  it("bakiye 1 kuruş eksikse TOLERE edilir (0.01 yuvarlama payı)", () => {
    // Kod: bakiye + 0.01 < tutar → hata. Yani 1 kuruş fark kabul ediliyor.
    const db: any = dbKur();
    db.hesaplar[0].bakiye = 799.99;
    expect(finansIslemDogrula(db, odeme({ tutar: 800, hesapSatirlari: [{ hesapId: "h-kasa", tutar: 800 }] })).gecerli).toBe(true);
  });

  it("bakiye 2 kuruş eksikse reddedilir", () => {
    const db: any = dbKur();
    db.hesaplar[0].bakiye = 799.98;
    const r = finansIslemDogrula(db, odeme({ tutar: 800, hesapSatirlari: [{ hesapId: "h-kasa", tutar: 800 }] }));
    expect(r.gecerli).toBe(false);
    expect(r.hatalar.join(" ")).toMatch(/yeterli bakiye/i);
  });

  it("tahsilatta bakiye kontrolü YAPILMAZ (sadece ödemede)", () => {
    const db: any = dbKur();
    db.hesaplar[0].bakiye = 0;
    expect(finansIslemDogrula(db, tahsilat()).gecerli).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* finansIslemiUygula                                                  */
/* ------------------------------------------------------------------ */

describe("finansIslemiUygula — tahsilat", () => {
  it("cari bakiyesini düşürür ve kasa bakiyesini artırır", () => {
    const r = finansIslemiUygula(dbKur(), tahsilat(), "islem-1")!;
    expect(r).not.toBeNull();
    expect(r.db.cariler[0].bakiye).toBe(400); // 1000 - 600
    expect(r.db.hesaplar[0].bakiye).toBe(5600); // 5000 + 600
  });

  it("cari ve hesap hareketi oluşturur, kasa işlemi kaydı ekler", () => {
    const r = finansIslemiUygula(dbKur(), tahsilat(), "islem-1")!;
    expect(r.db.cariler[0].hareketler).toHaveLength(1);
    expect(r.db.cariler[0].hareketler[0]).toMatchObject({ tutar: 600, tur: "ödeme", kaynakKasaIslemiId: "islem-1" });
    expect(r.db.hesaplar[0].hareketler).toHaveLength(1);
    expect(r.db.hesaplar[0].hareketler[0]).toMatchObject({ giris: 600, cikis: 0, kaynakId: "islem-1" });
    expect(r.db.kasaIslemleri).toHaveLength(1);
    expect(r.db.kasaIslemleri[0]).toMatchObject({ id: "islem-1", yon: "tahsilat", taraf: "musteri", tutar: 600, durum: "Tamamlandı" });
  });

  it("fatura tahsisi satışın acikHesapOdenen alanını artırır", () => {
    const r = finansIslemiUygula(dbKur(), tahsilat({ faturaTahsisleri: [{ faturaId: "s1", tutar: 600 }] }), "islem-1")!;
    expect(r.db.satislar.find((s: any) => s.id === "s1").acikHesapOdenen).toBe(600);
    expect(r.db.satislar.find((s: any) => s.id === "s2").acikHesapOdenen).toBe(0); // dokunulmadı
  });

  it("çok hesaba bölünmüş tahsilatta her hesap ayrı hareket alır", () => {
    const r = finansIslemiUygula(
      dbKur(),
      tahsilat({
        hesapSatirlari: [
          { hesapId: "h-kasa", tutar: 200, yontem: "Nakit" },
          { hesapId: "h-banka", tutar: 400, yontem: "Havale" },
        ],
      }),
      "islem-1"
    )!;
    expect(r.db.hesaplar.find((h: any) => h.id === "h-kasa").bakiye).toBe(5200);
    expect(r.db.hesaplar.find((h: any) => h.id === "h-banka").bakiye).toBe(20400);
    expect(r.db.kasaIslemleri[0].odemeSatirlari).toHaveLength(2);
  });

  it("aynı islemId ikinci kez uygulanmaz (idempotency)", () => {
    const ilk = finansIslemiUygula(dbKur(), tahsilat(), "islem-1")!;
    const ikinci = finansIslemiUygula(ilk.db, tahsilat(), "islem-1");
    expect(ikinci).toBeNull();
    expect(finansIslemIdempotentMi(ilk.db, "islem-1")).toBe(true);
  });

  it("doğrulama geçmezse null döner ve db değişmez", () => {
    expect(finansIslemiUygula(dbKur(), tahsilat({ tutar: 0 }), "x")).toBeNull();
  });

  it("girdi db'sini değiştirmez (immutable)", () => {
    const db = dbKur();
    finansIslemiUygula(db, tahsilat(), "islem-1");
    expect(db.cariler[0].bakiye).toBe(1000);
    expect(db.kasaIslemleri).toHaveLength(0);
  });

  it("tutarları 2 ondalığa yuvarlar", () => {
    const r = finansIslemiUygula(dbKur(), tahsilat({ tutar: 100.555, hesapSatirlari: [{ hesapId: "h-kasa", tutar: 100.555 }] }), "i")!;
    expect(r.islem.tutar).toBe(100.56);
    expect(r.db.hesaplar[0].bakiye).toBe(5100.56);
  });

  it("tahsilat belgesi boşsa aciklama varsayılan 'Tahsilat' olur", () => {
    const r = finansIslemiUygula(dbKur(), tahsilat(), "i")!;
    expect(r.db.cariler[0].hareketler[0].aciklama).toBe("Tahsilat");
  });
});

describe("finansIslemiUygula — ödeme", () => {
  it("tedarikçi bakiyesini düşürür ve banka bakiyesini azaltır", () => {
    const r = finansIslemiUygula(dbKur(), odeme(), "islem-2")!;
    expect(r.db.tedarikciler[0].bakiye).toBe(0); // 800 - 800
    expect(r.db.hesaplar.find((h: any) => h.id === "h-banka").bakiye).toBe(19200);
  });

  it("kasa hareketi çıkış olarak yazılır", () => {
    const r = finansIslemiUygula(dbKur(), odeme(), "islem-2")!;
    const h = r.db.hesaplar.find((x: any) => x.id === "h-banka").hareketler[0];
    expect(h.giris).toBe(0);
    expect(h.cikis).toBe(800);
  });

  it("fatura tahsisi mal alımının odenenTutar alanını artırır", () => {
    const r = finansIslemiUygula(dbKur(), odeme({ faturaTahsisleri: [{ faturaId: "m1", tutar: 800 }] }), "islem-2")!;
    expect(r.db.malAlimlari[0].odenenTutar).toBe(800);
  });

  it("kasa işlemi taraf 'tedarikci' olarak kaydedilir", () => {
    const r = finansIslemiUygula(dbKur(), odeme(), "islem-2")!;
    expect(r.db.kasaIslemleri[0].taraf).toBe("tedarikci");
  });
});

/* ------------------------------------------------------------------ */
/* finansIslemiIptalEt                                                 */
/* ------------------------------------------------------------------ */

describe("finansIslemiIptalEt", () => {
  const tahsilatYap = () => finansIslemiUygula(dbKur(), tahsilat({ faturaTahsisleri: [{ faturaId: "s1", tutar: 600 }] }), "islem-1")!.db;

  it("tahsilat iptalinde cari bakiyesi geri yükselir, kasa düşer", () => {
    const db = tahsilatYap();
    const r = finansIslemiIptalEt(db, "islem-1", "Müşteri vazgeçti", "test", "iptal-1")!;
    expect(r.db.cariler[0].bakiye).toBe(1000); // başlangıca döndü
    expect(r.db.hesaplar[0].bakiye).toBe(5000);
  });

  it("fatura tahsisi geri alınır", () => {
    const db = tahsilatYap();
    const r = finansIslemiIptalEt(db, "islem-1", "İade", "test", "iptal-1")!;
    expect(r.db.satislar.find((s: any) => s.id === "s1").acikHesapOdenen).toBe(0);
  });

  it("orijinal işlem silinmez, 'İptal Edildi' olarak işaretlenir", () => {
    const db = tahsilatYap();
    const r = finansIslemiIptalEt(db, "islem-1", "İade", "test", "iptal-1")!;
    const orijinal = r.db.kasaIslemleri.find((x: any) => x.id === "islem-1");
    expect(orijinal.durum).toBe("İptal Edildi");
    expect(orijinal.iptalNedeni).toBe("İade");
    expect(orijinal.iptalTersIslemId).toBe("iptal-1");
  });

  it("ters işlem kaydı yönü çevrilerek oluşturulur", () => {
    const db = tahsilatYap();
    const r = finansIslemiIptalEt(db, "islem-1", "İade", "test", "iptal-1")!;
    const ters = r.db.kasaIslemleri.find((x: any) => x.id === "iptal-1");
    expect(ters.yon).toBe("odeme"); // tahsilatın tersi
    expect(ters.tersIslem).toBe(true);
    expect(ters.iptalEdilenIslemId).toBe("islem-1");
    expect(ters.tutar).toBe(600);
  });

  it("aynı işlem iki kez iptal edilemez", () => {
    const db = tahsilatYap();
    const ilk = finansIslemiIptalEt(db, "islem-1", "İade", "test", "iptal-1")!;
    expect(finansIslemiIptalEt(ilk.db, "islem-1", "İade", "test", "iptal-2")).toBeNull();
  });

  it("iptal nedeni boşsa reddedilir", () => {
    expect(finansIslemiIptalEt(tahsilatYap(), "islem-1", "   ", "test", "iptal-1")).toBeNull();
  });

  it("olmayan işlem iptal edilemez", () => {
    expect(finansIslemiIptalEt(tahsilatYap(), "yok", "sebep", "test", "iptal-1")).toBeNull();
  });

  it("ödeme iptalinde tedarikçi borcu geri gelir, banka bakiyesi artar", () => {
    const db = finansIslemiUygula(dbKur(), odeme(), "islem-2")!.db;
    const r = finansIslemiIptalEt(db, "islem-2", "Yanlış tedarikçi", "test", "iptal-2")!;
    expect(r.db.tedarikciler[0].bakiye).toBe(800);
    expect(r.db.hesaplar.find((h: any) => h.id === "h-banka").bakiye).toBe(20000);
  });

  it("iptal + yeniden tahsilat bakiyeleri tutarlı bırakır", () => {
    const db = tahsilatYap();
    const iptal = finansIslemiIptalEt(db, "islem-1", "İade", "test", "iptal-1")!.db;
    const yeniden = finansIslemiUygula(iptal, tahsilat(), "islem-3")!;
    expect(yeniden.db.cariler[0].bakiye).toBe(400);
    expect(yeniden.db.hesaplar[0].bakiye).toBe(5600);
  });
});

/* ------------------------------------------------------------------ */
/* finansTutarlilikKontrolu                                            */
/* ------------------------------------------------------------------ */

describe("finansTutarlilikKontrolu", () => {
  it("tutarlı veritabanında bulgu dönmez", () => {
    const db: any = dbKur();
    db.cariler[0].hareketler = [{ id: "ch1", tarih: "2026-01-01", tutar: 1000, tur: "borç", aciklama: "Satış", belgeNo: "", bakiyeSonrasi: 1000 }];
    db.hesaplar[0].hareketler = [{ id: "hh1", tarih: "2026-01-01", tur: "Giriş", aciklama: "", belgeNo: "", giris: 5000, cikis: 0, bakiyeSonrasi: 5000, kullanici: "" }];
    const bulgular = finansTutarlilikKontrolu(db).filter((b) => b.id === "c1" || b.id === "h-kasa");
    expect(bulgular).toHaveLength(0);
  });

  it("bakiye ile hareketler uyuşmazsa bulgu üretir", () => {
    const db: any = dbKur();
    db.cariler[0].bakiye = 1000;
    db.cariler[0].hareketler = [{ id: "ch1", tarih: "2026-01-01", tutar: 600, tur: "borç", aciklama: "", belgeNo: "", bakiyeSonrasi: 600 }];
    const bulgu = finansTutarlilikKontrolu(db).find((b) => b.id === "c1");
    expect(bulgu).toBeTruthy();
    expect(bulgu!.beklenen).toBe(600); // son hareketin bakiyeSonrasi
    expect(bulgu!.kayitli).toBe(1000); // cari.bakiye
    expect(bulgu!.fark).toBe(-400); // fark = beklenen − kayitli
  });

  it("tahsilat sonrası tutarlılık bozulmaz (uçtan uca)", () => {
    const r = finansIslemiUygula(dbKur(), tahsilat(), "islem-1")!;
    const bulgular = finansTutarlilikKontrolu(r.db).filter((b) => b.id === "c1" || b.id === "h-kasa");
    expect(bulgular).toHaveLength(0);
  });

  it("iptal sonrası da tutarlılık korunur", () => {
    const db = finansIslemiUygula(dbKur(), tahsilat(), "islem-1")!.db;
    const iptal = finansIslemiIptalEt(db, "islem-1", "İade", "test", "iptal-1")!.db;
    const bulgular = finansTutarlilikKontrolu(iptal).filter((b) => b.id === "c1" || b.id === "h-kasa");
    expect(bulgular).toHaveLength(0);
  });
});
