/**
 * GERÇEK TEST — belge numaralandırma
 * Kaynak: src/lib/belge.ts
 *
 * Bu dosya uygulama kodunu import eder; "yeşil" olması gerçekten bir şey ifade eder.
 */
import { describe, it, expect } from "vitest";
import { yeniBelgeNumarasiUret, belgeSayaciGuncelle, satisBelgeNoGoster } from "../../src/lib/belge";

const bosDb = () => ({ belgeSayaclari: {}, ayarlar: {} });

describe("yeniBelgeNumarasiUret", () => {
  it("sayaç boşken 000001 üretir", () => {
    const r = yeniBelgeNumarasiUret(bosDb(), "Satış Fişi");
    expect(r.belgeNo).toMatch(/^\w+-\d{4}-000001$/);
    expect(r.siraSonraki).toBe(1);
  });

  it("sayaç varsa bir artırır", () => {
    const db = { belgeSayaclari: {}, ayarlar: {} };
    const ilk = yeniBelgeNumarasiUret(db, "Satış Fişi");
    const db2 = belgeSayaciGuncelle(db, ilk.anahtar, ilk.siraSonraki);
    const ikinci = yeniBelgeNumarasiUret(db2, "Satış Fişi");
    expect(ikinci.siraSonraki).toBe(2);
    expect(ikinci.belgeNo).toMatch(/-000002$/);
    expect(ikinci.belgeNo).not.toBe(ilk.belgeNo);
  });

  it("aynı belge türünde numaralar tekil ve sıralıdır", () => {
    let db = bosDb();
    const uretilen = [];
    for (let i = 0; i < 50; i++) {
      const r = yeniBelgeNumarasiUret(db, "Satış Fişi");
      db = belgeSayaciGuncelle(db, r.anahtar, r.siraSonraki);
      uretilen.push(r.belgeNo);
    }
    expect(new Set(uretilen).size).toBe(50); // hiç tekrar yok
    expect(uretilen[49]).toMatch(/-000050$/);
  });

  it("farklı belge türleri kendi sayaçlarını kullanır", () => {
    let db = bosDb();
    const satis = yeniBelgeNumarasiUret(db, "Satış Fişi"); // önek ST
    db = belgeSayaciGuncelle(db, satis.anahtar, satis.siraSonraki);
    const fatura = yeniBelgeNumarasiUret(db, "Fatura"); // önek FT
    expect(fatura.siraSonraki).toBe(1); // ayrı sayaç
    expect(fatura.belgeNo).not.toBe(satis.belgeNo);
    expect(fatura.belgeNo.startsWith("FT-")).toBe(true);
    expect(satis.belgeNo.startsWith("ST-")).toBe(true);
  });

  it("tanımsız belge türü ST'ye düşer ama artık SESSİZ değil (uyarı basar)", () => {
    // "Alış Faturası" BELGE_TUR_ONEKLERI'nde yok → "ST" + satış sayacı.
    // Risk: sessizce satışla aynı sayacı paylaşmak. Uyarı basıldığı doğrulanıyor.
    const uyarilar: string[] = [];
    const orijinal = console.warn;
    console.warn = (...a: any[]) => uyarilar.push(a.join(" "));
    try {
      const r = yeniBelgeNumarasiUret(bosDb(), "Alış Faturası");
      expect(r.belgeNo.startsWith("ST-")).toBe(true);
    } finally {
      console.warn = orijinal;
    }
    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0]).toContain("Alış Faturası");
  });

  it("aynı tanımsız tür için uyarı yalnızca bir kez basar (spam yok)", () => {
    const uyarilar: string[] = [];
    const orijinal = console.warn;
    console.warn = (...a: any[]) => uyarilar.push(a.join(" "));
    try {
      yeniBelgeNumarasiUret(bosDb(), "Alış Faturası");
      yeniBelgeNumarasiUret(bosDb(), "Alış Faturası");
      yeniBelgeNumarasiUret(bosDb(), "Alış Faturası");
    } finally {
      console.warn = orijinal;
    }
    expect(uyarilar).toHaveLength(0); // ilk testte zaten uyarıldı → set'te
  });

  it("geçerli her belge türü kendi önekiyle üretilir", () => {
    for (const tur of ["Satış Fişi", "Fatura", "İrsaliye", "Tahsilat Makbuzu", "İade Belgesi", "Teklif"]) {
      const r = yeniBelgeNumarasiUret(bosDb(), tur);
      expect(r.belgeNo).toMatch(/^[A-Z]{2}-\d{4}-000001$/);
    }
  });

  it("6 haneden sonra da tekil kalır (padStart taşması)", () => {
    const db = { belgeSayaclari: { "ST-2026": 999999 }, ayarlar: {} };
    const r = yeniBelgeNumarasiUret(db, "Satış Fişi");
    expect(r.siraSonraki).toBe(1000000);
    expect(r.belgeNo).toMatch(/-1000000$/);
  });

  it("db.ayarlar.belgeOnekleri özel öneki öncelikli kullanır", () => {
    const db = { belgeSayaclari: {}, ayarlar: { belgeOnekleri: { "Satış Fişi": "XYZ" } } };
    const r = yeniBelgeNumarasiUret(db, "Satış Fişi");
    expect(r.belgeNo.startsWith("XYZ-")).toBe(true);
  });
});

describe("belgeSayaciGuncelle", () => {
  it("diğer sayaçları bozmaz", () => {
    const prev = { belgeSayaclari: { "A-2026": 5, "B-2026": 9 }, diger: "korunmali" };
    const sonraki = belgeSayaciGuncelle(prev, "A-2026", 6);
    expect(sonraki.belgeSayaclari["A-2026"]).toBe(6);
    expect(sonraki.belgeSayaclari["B-2026"]).toBe(9);
    expect(sonraki.diger).toBe("korunmali");
  });

  it("orijinal db'yi değiştirmez (immutable)", () => {
    const prev = { belgeSayaclari: { "A-2026": 5 } };
    belgeSayaciGuncelle(prev, "A-2026", 6);
    expect(prev.belgeSayaclari["A-2026"]).toBe(5);
  });
});

describe("satisBelgeNoGoster", () => {
  it("belgeNo varsa onu döndürür", () => {
    expect(satisBelgeNoGoster({ belgeNo: "ST-2026-000042", id: "s_abc123def" })).toBe("ST-2026-000042");
  });

  it("belgeNo yoksa id'nin son 6 karakterini büyük harfe çevirir", () => {
    expect(satisBelgeNoGoster({ id: "s_abc123def" })).toBe("123DEF");
  });
});
