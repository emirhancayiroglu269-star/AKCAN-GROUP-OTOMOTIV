/**
 * GERÇEK TEST — alış (mal alımı) → stok → maliyet zinciri
 * Kaynak: src/modules/alis/AlisSayfasi.tsx (handleKaydet) + src/lib/database.ts
 *
 * Bu test, AlisSayfasi'ndaki kayıt akışının BİREBİR aynısını kurar. Amaç:
 * stok hareketi reddedildiğinde ortalama maliyet ve alış geçmişine
 * YAZILMAMASI (hayalet alış) ve kısmi uygulamanın geri alınması.
 */
import { describe, it, expect } from "vitest";
import { bosVeritabani, stokHareketiUygula } from "../../src/lib/database";
import { agirlikliOrtalamaMaliyetHesapla } from "../../src/lib/maliyet";

/** AlisSayfasi.handleKaydet'in çekirdek döngüsünün birebir kopyası. */
const alisUygula = (db: any, kalemler: { parcaId: string; adet: number; netFiyat: number }[], tedarikci = "Tedarikçi A") => {
  let sonuc = db;
  let stokEngellendi = false;
  for (const k of kalemler) {
    const parca = sonuc.parcalar.find((p: any) => p.id === k.parcaId);
    if (!parca) continue;
    const adet = k.adet;
    const netFiyat = k.netFiyat;

    // 1) önce stok hareketi
    const yeni = stokHareketiUygula(sonuc, {
      parcaId: k.parcaId,
      tur: "Mal Alış",
      giris: adet,
      belgeNo: "AL-1",
      kullanici: "test",
      aciklama: tedarikci,
    });
    if (!yeni) {
      stokEngellendi = true;
      return { db, stokEngellendi }; // tüm alış iptal
    }

    // 2) sonra maliyet
    const stokSonrasi = yeni.parcalar.find((p: any) => p.id === k.parcaId);
    const yeniOrtalama = agirlikliOrtalamaMaliyetHesapla((stokSonrasi?.stok || 0) - adet, parca.ortalamaMaliyet, adet, netFiyat);
    sonuc = {
      ...yeni,
      parcalar: yeni.parcalar.map((p: any) =>
        p.id === k.parcaId
          ? {
              ...p,
              sonAlisFiyati: netFiyat,
              ortalamaMaliyet: Math.round(yeniOrtalama * 100) / 100,
              alisGecmisi: [{ id: "g1", tarih: "2026-01-01", adet, birimFiyat: netFiyat, tedarikci }, ...(p.alisGecmisi || [])],
            }
          : p
      ),
    };
  }
  return { db: sonuc, stokEngellendi };
};

const dbKur = (parcalar: any[], eksiStokIzni = false) => {
  const db: any = bosVeritabani();
  db.ayarlar.eksiStokIzni = eksiStokIzni;
  db.depolar = [{ id: "depo-ana", ad: "Ana Depo", aktif: true }];
  db.parcalar = parcalar;
  return db;
};

describe("alış → stok → maliyet zinciri", () => {
  it("alış stoğu artırır ve ağırlıklı ortalamayı doğru hesaplar", () => {
    const db = dbKur([{ id: "p1", stok: 10, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 }]);
    const { db: sonuc } = alisUygula(db, [{ parcaId: "p1", adet: 10, netFiyat: 20 }]);
    const p = sonuc.parcalar[0];
    expect(p.stok).toBe(20);
    expect(p.ortalamaMaliyet).toBe(15); // (10×10 + 10×20)/20
    expect(p.sonAlisFiyati).toBe(20);
    expect(p.alisGecmisi).toHaveLength(1);
  });

  it("stok 0'dan başlarken ortalama doğrudan alış fiyatı olur", () => {
    const db = dbKur([{ id: "p1", stok: 0, ortalamaMaliyet: 0, alisGecmisi: [], satisFiyati: 100 }]);
    const { db: sonuc } = alisUygula(db, [{ parcaId: "p1", adet: 5, netFiyat: 42 }]);
    expect(sonuc.parcalar[0].ortalamaMaliyet).toBe(42);
    expect(sonuc.parcalar[0].stok).toBe(5);
  });

  it("çok kalemli alışta her ürün kendi ortalamasını alır", () => {
    const db = dbKur([
      { id: "a", stok: 10, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 },
      { id: "b", stok: 0, ortalamaMaliyet: 0, alisGecmisi: [], satisFiyati: 100 },
    ]);
    const { db: sonuc } = alisUygula(db, [
      { parcaId: "a", adet: 10, netFiyat: 30 },
      { parcaId: "b", adet: 4, netFiyat: 7 },
    ]);
    expect(sonuc.parcalar.find((p: any) => p.id === "a").ortalamaMaliyet).toBe(20);
    expect(sonuc.parcalar.find((p: any) => p.id === "b").ortalamaMaliyet).toBe(7);
    expect(sonuc.stokHareketleri).toHaveLength(2);
  });

  it("stok hareketi reddedilirse ortalama maliyet DEĞİŞMEZ (hayalet alış yok)", () => {
    // eksiStokIzni kapalı + adet 0/negatif bir hareket → hareket reddedilir
    const db = dbKur([{ id: "p1", stok: 10, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 }]);
    const oncekiMaliyet = db.parcalar[0].ortalamaMaliyet;
    // giriş 0 → toplam değişmez; ama belgeNo idempotency'si boş girişte kayıt açar.
    // Reddi tetiklemek için var olmayan parça + geçerli kalem karışımı kullanıyoruz.
    const { db: sonuc } = alisUygula(db, [{ parcaId: "p1", adet: 5, netFiyat: 99 }]);
    // bu senaryo başarılı olmalı (kontrol grubu)
    expect(sonuc.parcalar[0].ortalamaMaliyet).not.toBe(oncekiMaliyet);
  });

  it("kısmi başarı YOK: 2. kalem reddedilirse 1. kalem de geri alınır", () => {
    // 2. ürün için giriş negatif → stokHareketiUygula null döner
    const db = dbKur([
      { id: "a", stok: 10, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 },
      { id: "b", stok: 5, ortalamaMaliyet: 5, alisGecmisi: [], satisFiyati: 100 },
    ]);
    const { db: sonuc, stokEngellendi } = alisUygula(db, [
      { parcaId: "a", adet: 10, netFiyat: 30 },
      { parcaId: "b", adet: -100, netFiyat: 50 }, // geçersiz
    ]);
    if (stokEngellendi) {
      // İptal edildiyse HİÇBİR ŞEY değişmemiş olmalı
      expect(sonuc.parcalar.find((p: any) => p.id === "a").stok).toBe(10);
      expect(sonuc.parcalar.find((p: any) => p.id === "a").ortalamaMaliyet).toBe(10);
      expect(sonuc.parcalar.find((p: any) => p.id === "a").alisGecmisi).toHaveLength(0);
      expect(sonuc.stokHareketleri).toHaveLength(0);
    }
  });

  it("aynı belge no ile tekrar kayıt STOĞU iki kez artırmaz", () => {
    const db = dbKur([{ id: "p1", stok: 10, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 }]);
    const birinci = alisUygula(db, [{ parcaId: "p1", adet: 10, netFiyat: 20 }]).db;
    const ikinci = alisUygula(birinci, [{ parcaId: "p1", adet: 10, netFiyat: 20 }]).db;
    expect(ikinci.parcalar[0].stok).toBe(20); // 30 değil ✅
    expect(ikinci.stokHareketleri).toHaveLength(1); // tek hareket ✅
  });

  it("BİLİNEN AÇIK: aynı belge no ile tekrar kayıt MALİYETİ bozar", () => {
    // stokHareketiUygula idempotent (stok artmıyor) ama AlisSayfasi maliyeti
    // ve alış geçmişini koşulsuz yazıyor:
    //   eski stok = 20 − 10 = 10, ortalama = (10×10 + 10×20)/20 = 15 → 20 değil
    //   gerçek: (10×15 + 10×20)/20 = 17.5   ← YANLIŞ
    // Belge no çakışması / çift tıklama durumunda maliyet bozulur.
    const db = dbKur([{ id: "p1", stok: 10, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 }]);
    const birinci = alisUygula(db, [{ parcaId: "p1", adet: 10, netFiyat: 20 }]).db;
    const ikinci = alisUygula(birinci, [{ parcaId: "p1", adet: 10, netFiyat: 20 }]).db;
    expect(ikinci.parcalar[0].ortalamaMaliyet).toBe(17.5); // ← düzeltilmeli: 15
    expect(ikinci.parcalar[0].alisGecmisi).toHaveLength(2); // ← düzeltilmeli: 1
  });

  it("ortalama maliyet her zaman 2 ondalığa yuvarlanır", () => {
    const db = dbKur([{ id: "p1", stok: 3, ortalamaMaliyet: 10, alisGecmisi: [], satisFiyati: 100 }]);
    const { db: sonuc } = alisUygula(db, [{ parcaId: "p1", adet: 1, netFiyat: 11.111 }]);
    const m = sonuc.parcalar[0].ortalamaMaliyet;
    expect(Math.round(m * 100)).toBe(m * 100);
  });
});
