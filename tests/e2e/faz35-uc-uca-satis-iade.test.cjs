/**
 * V17 Faz 35 — Uçtan Uca Satış / İade / Stok / Maliyet regresyonu.
 * Çalıştırma: Node/CI ortamında transpile edilmiş lib çıktıları ile.
 */
const { stokHareketiUygula } = require("../../src/lib/database");
const { agirlikliOrtalamaMaliyetHesapla, satisKalemiKarBilgisi } = require("../../src/lib/maliyet");
const { ucUcaMutabakatOzeti } = require("../../src/lib/uc-uca-mutabakat");

function assert(name, condition, detail = "") {
  if (!condition) throw new Error(`FAIL | ${name}${detail ? ` | ${detail}` : ""}`);
  console.log(`PASS | ${name}${detail ? ` | ${detail}` : ""}`);
}

let db = {
  ayarlar: { eksiStokIzni: false, maliyetYontemi: "agirlikliOrtalama" },
  depolar: [{ id: "depo-ana", ad: "Ana Depo" }],
  parcalar: [{ id: "p1", stok: 0, ortalamaMaliyet: 0, sonAlisFiyati: 0, alisFiyati: 0, kdvOrani: 20 }],
  stokHareketleri: [],
  satislar: [],
  iadeler: [],
  posTahsilatlari: [],
  cariler: [],
  tedarikciler: [],
  hesaplar: [],
  kasaIslemleri: [],
};

// ALIŞ → +10 stok, 500 TL maliyet.
db.parcalar[0].ortalamaMaliyet = agirlikliOrtalamaMaliyetHesapla(0, 0, 10, 500);
db = stokHareketiUygula(db, { parcaId: "p1", tur: "Alış", giris: 10, belgeNo: "AL-001", kullanici: "E2E" });
assert("Alış sonrası stok", db.parcalar[0].stok === 10);

// Aynı belge/kalem ikinci kez gelirse idempotent kalmalı.
const hareketSayisi = db.stokHareketleri.length;
db = stokHareketiUygula(db, { parcaId: "p1", tur: "Alış", giris: 10, belgeNo: "AL-001", kullanici: "E2E" });
assert("Aynı alış ikinci kez işlenmiyor", db.stokHareketleri.length === hareketSayisi && db.parcalar[0].stok === 10);

// SATIŞ → -5 stok, 6.000 TL KDV dahil ödeme.
db = stokHareketiUygula(db, { parcaId: "p1", tur: "Satış", cikis: 5, belgeNo: "SAT-001", kullanici: "E2E" });
db.satislar.push({
  id: "SAT-001",
  durum: "Tamamlandı",
  genelToplam: 6000,
  odemeler: [{ tutar: 6000 }],
  kalemler: [{ parcaId: "p1", adet: 5, birimFiyat: 1200, kdvOrani: 20, maliyet: 500 }],
});
assert("Satış sonrası stok", db.parcalar[0].stok === 5);
const satisKari = satisKalemiKarBilgisi(db.satislar[0].kalemler[0]).karToplam;
assert("Satış brüt kârı", Math.abs(satisKari - 2500) < 0.01, `${satisKari} TL`);

// KISMİ İADE → 2 adet stok geri girer ve 2.400 TL iade edilir.
db = stokHareketiUygula(db, { parcaId: "p1", tur: "İade", giris: 2, belgeNo: "IAD-001", kullanici: "E2E" });
db.iadeler.push({
  id: "IAD-001",
  tutar: 2400,
  kapatmaYontemi: "Nakit",
  kalemler: [{ parcaId: "p1", adet: 2, birimFiyat: 1200, kdvOrani: 20, maliyet: 500 }],
});
assert("Kısmi iade sonrası stok", db.parcalar[0].stok === 7);

// İade sonrası kalan 3 adet için brüt kâr: 3 × (1200/1.2 - 500) = 1500 TL.
const kalanKar = satisKalemiKarBilgisi({ adet: 3, birimFiyat: 1200, kdvOrani: 20, maliyet: 500 }).karToplam;
assert("İade sonrası kalan brüt kâr", Math.abs(kalanKar - 1500) < 0.01, `${kalanKar} TL`);

// Aynı iade tekrar gelirse stok +2 yapılmamalı.
const iadeHareketSayisi = db.stokHareketleri.length;
db = stokHareketiUygula(db, { parcaId: "p1", tur: "İade", giris: 2, belgeNo: "IAD-001", kullanici: "E2E" });
assert("Aynı iade ikinci kez işlenmiyor", db.stokHareketleri.length === iadeHareketSayisi && db.parcalar[0].stok === 7);

// Eksi stok koruması.
const engellenenSatis = stokHareketiUygula(db, { parcaId: "p1", tur: "Satış", cikis: 8, belgeNo: "SAT-002", kullanici: "E2E" });
assert("Yetersiz stok satışı engelleniyor", engellenenSatis === null);

// Son mutabakat.
const mutabakat = ucUcaMutabakatOzeti(db);
assert("Uçtan uca mutabakat temiz", mutabakat.temiz, JSON.stringify(mutabakat.bulgular));
