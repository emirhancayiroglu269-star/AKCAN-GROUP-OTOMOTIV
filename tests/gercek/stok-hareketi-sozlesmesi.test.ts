/**
 * GERÇEK TEST — stokHareketiUygula dönüş sözleşmesi
 * Kaynak: src/lib/database.ts → StokHareketiSonucu
 *
 * Fonksiyon önceden db döndürüyordu; "zaten uygulandı" ile "uygulandı"
 * ayırt edilemediği için alış maliyeti çift kayıtta bozuluyordu. Bu test
 * dört durumun da doğru raporlandığını garanti eder.
 */
import { describe, it, expect } from "vitest";
import { bosVeritabani, stokHareketiUygula, stokHareketiDb, stokHareketiUygulandiMi } from "../../src/lib/database";

const dbKur = (stok = 10, eksiStokIzni = false) => {
  const db: any = bosVeritabani();
  db.ayarlar.eksiStokIzni = eksiStokIzni;
  db.depolar = [{ id: "depo-ana", ad: "Ana Depo", aktif: true }];
  db.parcalar = [{ id: "p1", stok, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 }];
  return db;
};

describe("StokHareketiSonucu — dört durum", () => {
  it('başarılı harekette durum "uygulandi"', () => {
    const r = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5 });
    expect(r.durum).toBe("uygulandi");
    expect(r.db.parcalar[0].stok).toBe(15);
  });

  it('aynı belge tekrarında durum "zaten-uygulandi" ve db DEĞİŞMEZ', () => {
    const ilk = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5, belgeNo: "B1" });
    const ikinci = stokHareketiUygula(ilk.db, { parcaId: "p1", tur: "Mal Alış", giris: 5, belgeNo: "B1" });
    expect(ikinci.durum).toBe("zaten-uygulandi");
    expect(ikinci.db).toBe(ilk.db); // aynı referans — hiç kopya üretilmedi
    expect(ikinci.db.parcalar[0].stok).toBe(15);
    expect(ikinci.db.stokHareketleri).toHaveLength(1);
  });

  it('negatif stokta durum "engellendi" ve db DEĞİŞMEZ', () => {
    const db = dbKur(2, false);
    const r = stokHareketiUygula(db, { parcaId: "p1", tur: "Perakende Satış", cikis: 5 });
    expect(r.durum).toBe("engellendi");
    expect(r.db).toBe(db);
    expect(r.db.parcalar[0].stok).toBe(2);
  });

  it('olmayan parçada durum "parca-yok" ve db DEĞİŞMEZ', () => {
    const db = dbKur(10);
    const r = stokHareketiUygula(db, { parcaId: "yok", tur: "Mal Alış", giris: 5 });
    expect(r.durum).toBe("parca-yok");
    expect(r.db).toBe(db);
  });
});

describe("geriye dönük uyumluluk yardımcıları", () => {
  it("stokHareketiDb her durumda db verir", () => {
    expect(stokHareketiDb(stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5 })).parcalar[0].stok).toBe(15);
    expect(stokHareketiDb(stokHareketiUygula(dbKur(2, false), { parcaId: "p1", tur: "Perakende Satış", cikis: 9 })).parcalar[0].stok).toBe(2);
  });

  it("stokHareketiUygulandiMi yalnızca 'uygulandi' için true", () => {
    expect(stokHareketiUygulandiMi(stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5 }))).toBe(true);
    expect(stokHareketiUygulandiMi(stokHareketiUygula(dbKur(2, false), { parcaId: "p1", tur: "Perakende Satış", cikis: 9 }))).toBe(false);
  });
});

describe("idempotency anahtarı", () => {
  it("farklı tür aynı belgede ayrı hareket sayılır", () => {
    const ilk = stokHareketiUygula(dbKur(10), { parcaId: "p1", tur: "Mal Alış", giris: 5, belgeNo: "B1" });
    const ikinci = stokHareketiUygula(ilk.db, { parcaId: "p1", tur: "Sayım Fazlası", giris: 5, belgeNo: "B1" });
    expect(ikinci.durum).toBe("uygulandi");
    expect(ikinci.db.parcalar[0].stok).toBe(20);
  });

  it("farklı parça aynı belgede ayrı hareket sayılır", () => {
    const db = dbKur(10);
    db.parcalar.push({ id: "p2", stok: 0, ortalamaMaliyet: 0, alisGecmisi: [], satisFiyati: 50 });
    const ilk = stokHareketiUygula(db, { parcaId: "p1", tur: "Mal Alış", giris: 5, belgeNo: "B1" });
    const ikinci = stokHareketiUygula(ilk.db, { parcaId: "p2", tur: "Mal Alış", giris: 5, belgeNo: "B1" });
    expect(ikinci.durum).toBe("uygulandi");
    expect(ikinci.db.parcalar.find((p: any) => p.id === "p2").stok).toBe(5);
  });
});
