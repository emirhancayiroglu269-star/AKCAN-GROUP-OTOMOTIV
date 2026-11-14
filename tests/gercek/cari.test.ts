/**
 * GERÇEK TEST — cari / açık hesap motoru
 * Kaynak: src/services/rapor-service.ts
 *
 * "Açık Hesap" satışı, kalan borç ve vade gruplaması yanlış hesaplanırsa
 * tahsilat ekranı yanlış tutar gösterir ve müşteriye yanlış borç söylenir.
 */
import { describe, it, expect } from "vitest";
import { satisAcikHesapKalan, musteriAcikFaturalariFifo, vadeGrubuBul } from "../../src/services/rapor-service";

describe("satisAcikHesapKalan", () => {
  const satis = (odemeler, acikHesapOdenen = 0) => ({ id: "s1", genelToplam: 1000, odemeler, acikHesapOdenen });

  it("hiç ödeme yoksa 0 kalan döner", () => {
    expect(satisAcikHesapKalan(satis([]))).toBe(0);
  });

  it("sadece nakit ödendi ise açık hesap kalanı 0'dır", () => {
    expect(satisAcikHesapKalan(satis([{ yontem: "Nakit", tutar: 1000 }]))).toBe(0);
  });

  it("tamamen açık hesap ise kalan = tutar", () => {
    expect(satisAcikHesapKalan(satis([{ yontem: "Açık Hesap", tutar: 1000 }]))).toBe(1000);
  });

  it("kısmi açık hesap: 400 açık + 100 tahsil → 300 kalan", () => {
    expect(satisAcikHesapKalan(satis([{ yontem: "Açık Hesap", tutar: 400 }], 100))).toBe(300);
  });

  it("birden fazla açık hesap satırını toplar", () => {
    const s = satis([{ yontem: "Açık Hesap", tutar: 200 }, { yontem: "Açık Hesap", tutar: 300 }]);
    expect(satisAcikHesapKalan(s)).toBe(500);
  });

  it("2 ondalığa yuvarlar (kayan nokta artığı bırakmaz)", () => {
    const s = satis([{ yontem: "Açık Hesap", tutar: 0.1 }, { yontem: "Açık Hesap", tutar: 0.2 }]);
    expect(satisAcikHesapKalan(s)).toBe(0.3);
  });

  it("fazla tahsilatta negatif kalan döner (alacak)", () => {
    expect(satisAcikHesapKalan(satis([{ yontem: "Açık Hesap", tutar: 100 }], 150))).toBe(-50);
  });

  it("odemeler alanı yoksa çökmaz", () => {
    expect(satisAcikHesapKalan({ id: "s1", genelToplam: 100 })).toBe(0);
  });
});

describe("vadeGrubuBul", () => {
  it("vade tarihi yoksa tanımsız grup döner", () => {
    const r = vadeGrubuBul(null);
    expect(r).toBeTruthy();
  });

  it("geçmiş tarih 'gecikmis' grubuna düşer", () => {
    const dun = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const r = vadeGrubuBul(dun);
    expect(JSON.stringify(r)).toMatch(/gecik|geçmiş|vadesi/i);
  });

  it("ileri tarih gelecek grubuna düşer", () => {
    const gelecek = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const r = vadeGrubuBul(gelecek);
    expect(JSON.stringify(r)).not.toMatch(/gecik|geçmiş/i);
  });

  it("aynı girdi her zaman aynı grubu verir (deterministik)", () => {
    const t = "2026-06-15";
    expect(JSON.stringify(vadeGrubuBul(t))).toBe(JSON.stringify(vadeGrubuBul(t)));
  });
});

describe("musteriAcikFaturalariFifo", () => {
  // Fonksiyon müşteri.hareketler üzerinden tahsilat havuzu kurar ve FIFO dağıtır.
  const musteri = (hareketler = [], ekstra = {}) => ({ id: "c1", ad: "Test Müşteri", vadeGunu: 0, hareketler, ...ekstra });
  const satis = (id, tarih, tutar, ekstra = {}) => ({
    id, musteriId: "c1", tarih, durum: "Tamamlandı",
    odemeler: [{ yontem: "Açık Hesap", tutar }], ...ekstra,
  });

  it("açık hesap satırı olmayan satışları listeye koymaz", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 100, { odemeler: [{ yontem: "Nakit", tutar: 100 }] })] };
    expect(musteriAcikFaturalariFifo(db, musteri())).toHaveLength(0);
  });

  it("iptal edilen satışları atlar", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 500, { durum: "İptal Edildi" })] };
    expect(musteriAcikFaturalariFifo(db, musteri())).toHaveLength(0);
  });

  it("sonuç tarihe göre eskiden yeniye sıralıdır (FIFO)", () => {
    const db = { satislar: [satis("s3", "2026-03-01", 300), satis("s1", "2026-01-01", 100), satis("s2", "2026-02-01", 200)] };
    const r = musteriAcikFaturalariFifo(db, musteri());
    expect(r.map((x) => x.satis.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("başka müşterinin satışlarını karıştırmaz", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 100), satis("s2", "2026-01-01", 999, { musteriId: "c2" })] };
    const r = musteriAcikFaturalariFifo(db, musteri());
    expect(r).toHaveLength(1);
    expect(r[0].satis.id).toBe("s1");
  });

  it("müşteri id'si yoksa isimle (büyük/küçük harf duyarsız) eşleştirir", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 100, { musteriId: null, musteriAdi: "Ahmet" })] };
    const r = musteriAcikFaturalariFifo(db, { id: null, ad: "ahmet", vadeGunu: 0, hareketler: [] });
    expect(r).toHaveLength(1);
  });

  it("satış listesi boşsa boş dizi döner", () => {
    expect(musteriAcikFaturalariFifo({ satislar: [] }, musteri())).toEqual([]);
  });

  it("tahsilat havuzu FATURALARA eskiden yeniye dağıtılır", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 300), satis("s2", "2026-02-01", 300)] };
    const m = musteri([{ tur: "ödeme", tutar: 400 }]);
    const r = musteriAcikFaturalariFifo(db, m);
    // İlk fatura tamamen kapandı, kalan 100 ikinciye gitti
    expect(r[0].odenen).toBe(300);
    expect(r[0].kalan).toBe(0);
    expect(r[1].odenen).toBe(100);
    expect(r[1].kalan).toBe(200);
  });

  it("tahsilat toplam faturayı aşarsa kalan 0'ın altına inmez", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 100)] };
    const r = musteriAcikFaturalariFifo(db, musteri([{ tur: "ödeme", tutar: 500 }]));
    expect(r[0].kalan).toBe(0);
    expect(r[0].odenen).toBe(100); // fazlası sonraki faturaya (yoksa kaybolur)
  });

  it("vadeGunu varsa vade tarihi satış tarihinden türetilir", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 100)] };
    const r = musteriAcikFaturalariFifo(db, musteri([], { vadeGunu: 30 }));
    expect(r[0].vadeTarihi).toBe("2026-01-31");
  });

  it("vadeGunu 0 ise vade tarihi null olur", () => {
    const db = { satislar: [satis("s1", "2026-01-01", 100)] };
    expect(musteriAcikFaturalariFifo(db, musteri())[0].vadeTarihi).toBeNull();
  });
});
