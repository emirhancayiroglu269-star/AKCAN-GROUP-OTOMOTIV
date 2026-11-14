/**
 * GERÇEK TEST — stok hareketi motoru
 * Kaynak: src/lib/database.ts → stokHareketiUygula
 *
 * Bu fonksiyon sistemin TEK stok değiştirme yoludur; bozulursa stok, maliyet
 * ve kâr raporları birlikte bozulur. Bu yüzden en kritik test burada.
 */
import { describe, it, expect } from "vitest";
import { bosVeritabani, stokHareketiUygula } from "../../src/lib/database";

/** Tek ürünlü, temiz bir veritabanı üretir. */
const dbKur = (stok = 10, eksiStokIzni = false) => {
  const db: any = bosVeritabani();
  db.ayarlar.eksiStokIzni = eksiStokIzni;
  db.depolar = [{ id: "depo-ana", ad: "Ana Depo", aktif: true }];
  db.parcalar = [
    { id: "p1", stokKodu: "P-1", ad: "Test Ürün", marka: "X", stok, satisFiyati: 100, aktif: true },
  ];
  return db;
};

const stok = (db: any) => db.parcalar[0].stok;

describe("stokHareketiUygula — temel giriş/çıkış", () => {
  it("giriş stoğu artırır ve hareket kaydı oluşturur", () => {
    const sonuc = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5 });
    expect(stok(sonuc)).toBe(15);
    expect(sonuc.stokHareketleri).toHaveLength(1);
    expect(sonuc.stokHareketleri[0]).toMatchObject({ parcaId: "p1", tur: "Mal Alış", giris: 5, cikis: 0, kalanStok: 15 });
  });

  it("çıkış stoğu azaltır", () => {
    const sonuc = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Perakende Satış", cikis: 3 });
    expect(stok(sonuc)).toBe(7);
    expect(sonuc.stokHareketleri[0].kalanStok).toBe(7);
  });

  it("ondalıklı adetleri 3 haneye yuvarlar (kayan nokta hatası yok)", () => {
    const sonuc = stokHareketiUygula(dbKur(1), { parcaId: "p1", tur: "Mal Alış", giris: 0.1 });
    expect(stok(sonuc)).toBe(1.1);
    const sonuc2 = stokHareketiUygula(sonuc, { parcaId: "p1", tur: "Mal Alış", giris: 0.2 });
    expect(stok(sonuc2)).toBe(1.3); // 1.3000000000000003 değil
  });

  it("depo dağılımını (depoStoklari) toplamla eşit tutar", () => {
    const sonuc = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5 });
    const dagilim = sonuc.parcalar[0].depoStoklari;
    expect(dagilim).toHaveLength(1);
    expect(dagilim[0]).toEqual({ depoId: "depo-ana", adet: 15 });
  });
});

describe("stokHareketiUygula — negatif stok koruması", () => {
  it("eksiStokIzni kapalıyken negatife düşüren işlem null döner", () => {
    const sonuc = stokHareketiUygula(dbKur(2, false), { parcaId: "p1", tur: "Perakende Satış", cikis: 5 });
    expect(sonuc).toBeNull();
  });

  it("tam sıfıra düşürmek serbesttir (negatif değil)", () => {
    const sonuc = stokHareketiUygula(dbKur(3, false), { parcaId: "p1", tur: "Perakende Satış", cikis: 3 });
    expect(stok(sonuc)).toBe(0);
  });

  it("eksiStokIzni açıkken negatife düşebilir", () => {
    const sonuc = stokHareketiUygula(dbKur(2, true), { parcaId: "p1", tur: "Perakende Satış", cikis: 5 });
    expect(stok(sonuc)).toBe(-3);
  });

  it("var olmayan ürün için db değişmeden döner", () => {
    const db = dbKur(10);
    const sonuc = stokHareketiUygula(db, { parcaId: "yok", tur: "Mal Alış", giris: 5 });
    expect(sonuc).toBe(db);
    expect(stok(sonuc)).toBe(10);
  });
});

describe("stokHareketiUygula — idempotency (aynı belge iki kez uygulanmaz)", () => {
  it("aynı belge + aynı miktar ikinci kez uygulanmaz", () => {
    const ilk = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Perakende Satış", cikis: 2, belgeNo: "ST-1" });
    expect(stok(ilk)).toBe(8);
    const ikinci = stokHareketiUygula(ilk, { parcaId: "p1", tur: "Perakende Satış", cikis: 2, belgeNo: "ST-1" });
    expect(stok(ikinci)).toBe(8); // değişmedi
    expect(ikinci.stokHareketleri).toHaveLength(1);
  });

  it("aynı belge ama farklı miktar ayrı hareket olarak uygulanır", () => {
    const ilk = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Perakende Satış", cikis: 2, belgeNo: "ST-1" });
    const ikinci = stokHareketiUygula(ilk, { parcaId: "p1", tur: "Perakende Satış", cikis: 3, belgeNo: "ST-1" });
    expect(stok(ikinci)).toBe(5);
    expect(ikinci.stokHareketleri).toHaveLength(2);
  });

  it("belgeNo boşsa idempotency uygulanmaz (manuel hareketler tekrarlanabilir)", () => {
    const ilk = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Sayım", giris: 1 });
    const ikinci = stokHareketiUygula(ilk, { parcaId: "p1", tur: "Sayım", giris: 1 });
    expect(stok(ikinci)).toBe(12);
    expect(ikinci.stokHareketleri).toHaveLength(2);
  });
});

describe("stokHareketiUygula — immutability", () => {
  it("girdi db'sini değiştirmez", () => {
    const db = dbKur(10);
    stokHareketiUygula(db, { parcaId: "p1", tur: "Mal Alış", giris: 5 });
    expect(stok(db)).toBe(10);
    expect(db.stokHareketleri).toHaveLength(0);
  });

  it("yeni hareket listenin BAŞINA eklenir (en yeni önce)", () => {
    const ilk = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "İlk", giris: 1 });
    const ikinci = stokHareketiUygula(ilk, { parcaId: "p1", tur: "İkinci", giris: 1 });
    expect(ikinci.stokHareketleri[0].tur).toBe("İkinci");
  });
});

describe("stokHareketiUygula — gerçek satış senaryosu", () => {
  it("3 kalemli satışta stoklar doğru düşer, biri yetmezse null", () => {
    const db: any = bosVeritabani();
    db.ayarlar.eksiStokIzni = false;
    db.depolar = [{ id: "depo-ana", ad: "Ana Depo", aktif: true }];
    db.parcalar = [
      { id: "a", stok: 5, satisFiyati: 10, aktif: true },
      { id: "b", stok: 2, satisFiyati: 20, aktif: true },
      { id: "c", stok: 1, satisFiyati: 30, aktif: true },
    ];

    let sonuc = stokHareketiUygula(db, { parcaId: "a", tur: "Perakende Satış", cikis: 2, belgeNo: "ST-9" });
    sonuc = stokHareketiUygula(sonuc, { parcaId: "b", tur: "Perakende Satış", cikis: 2, belgeNo: "ST-9" });
    // c'den 5 isteniyor ama 1 var → null
    const ucuncu = stokHareketiUygula(sonuc, { parcaId: "c", tur: "Perakende Satış", cikis: 5, belgeNo: "ST-9" });

    expect(ucuncu).toBeNull();
    expect(sonuc.parcalar.find((p) => p.id === "a").stok).toBe(3);
    expect(sonuc.parcalar.find((p) => p.id === "b").stok).toBe(0);
    expect(sonuc.parcalar.find((p) => p.id === "c").stok).toBe(1); // dokunulmadı
  });
});
