/**
 * GERÇEK TEST — maliyet ve kâr motoru
 * Kaynak: src/lib/maliyet.ts
 *
 * Kritik: Perakende satış fiyatı KDV DAHİL, maliyet KDV HARİÇ girilir.
 * Bu ikisi aynı zemine çekilmezse kâr raporları yanlış çıkar.
 */
import { describe, it, expect } from "vitest";
import {
  agirlikliOrtalamaMaliyetHesapla,
  gecerliMaliyet,
  kdvHaricSatisFiyati,
  karTutariHesapla,
  karOraniMarkup,
  karOraniMargin,
  satisKalemiKarBilgisi,
} from "../../src/lib/maliyet";

describe("agirlikliOrtalamaMaliyetHesapla", () => {
  it("basit ortalama: 10 adet @10 + 10 adet @20 → 15", () => {
    expect(agirlikliOrtalamaMaliyetHesapla(10, 10, 10, 20)).toBeCloseTo(15, 5);
  });

  it("ağırlıklı: 30 adet @10 + 10 adet @20 → 12.5", () => {
    expect(agirlikliOrtalamaMaliyetHesapla(30, 10, 10, 20)).toBeCloseTo(12.5, 5);
  });

  it("eski stok 0 ise yeni fiyatı aynen alır", () => {
    expect(agirlikliOrtalamaMaliyetHesapla(0, 0, 5, 42)).toBeCloseTo(42, 5);
  });

  it("yeni adet 0 ise eski ortalamayı korur (bölme hatası yok)", () => {
    expect(agirlikliOrtalamaMaliyetHesapla(10, 25, 0, 99)).toBeCloseTo(25, 5);
  });

  it("hiç stok ve hiç alım yoksa 0 döner (alınmamış fiyat maliyet olmaz)", () => {
    // DÜZELTME: önceden `yeniFiyat` (99) dönüyordu; yeniAdet=0 geçen bir çağrı
    // hiç alınmamış bir fiyatı ortalama maliyet olarak yazdırabiliyordu.
    expect(agirlikliOrtalamaMaliyetHesapla(0, 0, 0, 99)).toBe(0);
  });

  it("negatif yeniAdet ortalamayı bozmaz (0 gibi davranır)", () => {
    expect(agirlikliOrtalamaMaliyetHesapla(10, 20, -5, 100)).toBeCloseTo(20, 5);
  });

  it("stok sıfırdan başlayıp alım varsa doğrudan alım fiyatı olur", () => {
    expect(agirlikliOrtalamaMaliyetHesapla(0, 0, 5, 40)).toBeCloseTo(40, 5);
  });

  it("sıfıra bölme / NaN üretmez", () => {
    const r = agirlikliOrtalamaMaliyetHesapla(0, 0, 0, 0);
    expect(Number.isNaN(r)).toBe(false);
  });
});

describe("gecerliMaliyet — maliyet yöntemi seçimi", () => {
  const urun = { ortalamaMaliyet: 12, sonAlisFiyati: 15, alisFiyati: 10 };

  it("agirlikliOrtalama (varsayılan) ortalamaMaliyet kullanır", () => {
    expect(gecerliMaliyet(urun, { ayarlar: {} })).toBe(12);
    expect(gecerliMaliyet(urun, { ayarlar: { maliyetYontemi: "agirlikliOrtalama" } })).toBe(12);
  });

  it("sonAlis yönteminde sonAlisFiyati kullanır", () => {
    expect(gecerliMaliyet(urun, { ayarlar: { maliyetYontemi: "sonAlis" } })).toBe(15);
  });

  it("ortalamaMaliyet yoksa sonAlisFiyati'na, o da yoksa alisFiyati'na düşer", () => {
    expect(gecerliMaliyet({ sonAlisFiyati: 15, alisFiyati: 10 }, { ayarlar: {} })).toBe(15);
    expect(gecerliMaliyet({ alisFiyati: 10 }, { ayarlar: {} })).toBe(10);
  });

  it("hiç maliyet alanı yoksa 0 döner (undefined/NaN değil)", () => {
    expect(gecerliMaliyet({}, { ayarlar: {} })).toBe(0);
  });
});

describe("KDV zemini — satış fiyatı dahil, maliyet hariç", () => {
  const urun = { satisFiyati: 120, kdvOrani: 20, ortalamaMaliyet: 80 };

  it("KDV hariç satış fiyatı: 120 / 1.20 = 100", () => {
    expect(kdvHaricSatisFiyati(urun)).toBeCloseTo(100, 5);
  });

  it("kâr tutarı: 100 (net satış) − 80 (maliyet) = 20", () => {
    expect(karTutariHesapla(urun)).toBeCloseTo(20, 5);
  });

  it("KDV oranı 0 ise satış fiyatı olduğu gibi kalır", () => {
    expect(kdvHaricSatisFiyati({ satisFiyati: 100, kdvOrani: 0 })).toBe(100);
  });

  it("KDV oranı tanımsızsa bölme yapılmaz", () => {
    expect(kdvHaricSatisFiyati({ satisFiyati: 100 })).toBe(100);
  });

  it("markup ve margin farklı sonuç verir (karıştırılmamalı)", () => {
    const markup = karOraniMarkup(urun); // kâr / maliyet
    const margin = karOraniMargin(urun); // kâr / satış
    expect(markup).toBeCloseTo(25, 5); // 20/80
    expect(margin).toBeCloseTo(20, 5); // 20/100
    expect(markup).not.toBe(margin);
  });
});

describe("satisKalemiKarBilgisi — satır bazlı kâr", () => {
  const kalem = { adet: 2, birimFiyat: 120, kdvOrani: 20, maliyet: 80, iskontoTutari: 0, genelIskontoPayi: 0 };

  it("iskontosuz satırda birim kâr 20, toplam kâr 40", () => {
    const r = satisKalemiKarBilgisi(kalem);
    expect(r.karBirim).toBeCloseTo(20, 5);
    expect(r.karToplam).toBeCloseTo(40, 5);
    expect(r.karYuzde).toBeCloseTo(25, 5);
  });

  it("satır iskontosu kârı düşürür", () => {
    // iskontoTutari TOPLAM tutar gibi ele alınıp adede bölünüyor:
    // (2×120 − 40) / 2 / 1.2 − 80 = 3.333 birim
    const r = satisKalemiKarBilgisi({ ...kalem, iskontoTutari: 40 });
    expect(r.karBirim).toBeCloseTo(3.3333, 3);
    expect(r.karToplam).toBeCloseTo(6.6667, 3);
    expect(r.karToplam).toBeLessThan(40); // iskontosuz 40'tan düşük
  });

  it("genel iskonto payı da kârı düşürür", () => {
    const r = satisKalemiKarBilgisi({ ...kalem, genelIskontoPayi: 40 });
    expect(r.karToplam).toBeCloseTo(6.6667, 3);
    expect(r.karToplam).toBeLessThan(40);
  });

  it("maliyet 0 ise karYuzde null döner (sonsuz bölme yok)", () => {
    const r = satisKalemiKarBilgisi({ ...kalem, maliyet: 0 });
    expect(r.karYuzde).toBeNull();
    expect(Number.isFinite(r.karToplam)).toBe(true);
  });

  it("zararına satışta kâr negatiftir", () => {
    const r = satisKalemiKarBilgisi({ ...kalem, maliyet: 200 });
    expect(r.karBirim).toBeLessThan(0);
    expect(r.karToplam).toBeLessThan(0);
  });

  it("adet 0 ise birim fiyat hesabı patlamaz", () => {
    const r = satisKalemiKarBilgisi({ ...kalem, adet: 0 });
    expect(Number.isNaN(r.karBirim)).toBe(false);
    expect(r.karToplam).toBeCloseTo(0, 10); // -0 de kabul
  });
});
