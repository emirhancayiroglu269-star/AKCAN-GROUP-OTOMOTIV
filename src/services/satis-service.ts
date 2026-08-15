/* Satış geçmişi ve kârlılık yardımcıları */
import { satisKalemiKarBilgisi, satisKalemiListeKari } from "../lib/maliyet";
import { tl } from "../lib/format";

/* ------------------------------------------------------------------ */
/* KRİTİK STOK VE SİPARİŞ ÖNERİSİ                                      */
/* ------------------------------------------------------------------ */
// sonSatisTarihiBul / sonNGunSatisAdedi artık ./lib/olu-stok içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* ÖLÜ STOK / YAVAŞ HAREKET EDEN ÜRÜN YÖNETİMİ                         */
/* ------------------------------------------------------------------ */
// SATIS_HIZI_SINIF_GORSELI / parcaSonSatisTarihi / satisHiziSiniflandir /
// stokYasiGunu / STOK_YASI_GRUPLARI / stokYasiGrubu / oluStokAksiyonOnerileri
// artık ./lib/olu-stok içinden import ediliyor.

/* ------------------------------------------------------------------ */
/* STOK DEVİR HIZI VE ÜRÜN PERFORMANS ANALİZİ                          */
/* ------------------------------------------------------------------ */
// Devir hızına göre 5 kademeli sınıflandırma (58. adım, 3. madde) — Ölü
// Stok modülündeki (57. adım) satış-ADEDİ tabanlı sınıflandırmadan FARKLI:
// burada YILLIKLANDIRILMIŞ devir hızı oranı esas alınır.
// DEVIR_HIZI_SINIF_GORSELI / devirHiziSinifBul / urunDevirHiziHesapla /
// grupDevirHiziHesapla artık ./lib/stok-performans içinden import ediliyor.

/* RAPORLAMA — paylaşılan yardımcı fonksiyonlar                        */
/* ------------------------------------------------------------------ */
// Bir satış kaleminin gerçek (KDV hariç, satır iskontosu düşülmüş) birim
// satış fiyatı ve birim kârı — Satış ekranındaki satirKarBilgisi ile aynı
// mantık, raporlarda geçmiş satışlar üzerinde kullanılmak üzere tekrarlanır.
// satisKalemiKarBilgisi / satisKalemiListeKari artık ./lib/maliyet içinden import ediliyor.

// Kâr / Maliyet Hesaplama Motoru — TÜM sistemin aynı hesaplamayı kullanması
// için tek merkezi fonksiyon. Dört kâr kademesini de bir arada döner:
// Brüt Kâr (liste fiyatı üzerinden) → İskonto Sonrası Kâr (gerçek satış
// fiyatı üzerinden — asıl "kâr" budur) → POS Komisyonu Sonrası Kâr →
// Giderler Sonrası Net Faaliyet Kârı.
export const karKademeleriHesapla = (db, kalemler, baslangic, bitis) => {
  const bruteKar = kalemler.reduce((t, k) => t + satisKalemiListeKari(k), 0);
  const iskontoSonrasiKar = kalemler.reduce((t, k) => t + satisKalemiKarBilgisi(k).karToplam, 0);
  const satisIdleri = new Set(kalemler.map((k) => k.satisId).filter(Boolean));
  // İptal edilmiş POS tahsilatının komisyonu net kârda kalmamalı.
  const posKomisyonu = (db.posTahsilatlari || [])
    .filter((t) => t.durum !== "İptal" && satisIdleri.has(t.kaynakSatisId))
    .reduce((t, x) => t + (Number(x.komisyonTutari) || 0), 0);
  const posKomisyonuSonrasiKar = iskontoSonrasiKar - posKomisyonu;
  const giderler = baslangic && bitis
    ? db.giderler
        .filter((g) => g.odemeDurumu !== "İptal" && g.tarih >= baslangic && g.tarih <= bitis)
        .reduce((t, g) => t + Number(g.kdvHaricTutar ?? g.tutar ?? 0), 0)
    : 0;
  const netFaaliyetKari = posKomisyonuSonrasiKar - giderler;
  return { bruteKar, iskontoSonrasiKar, posKomisyonu, posKomisyonuSonrasiKar, giderler, netFaaliyetKari };
};

/* ------------------------------------------------------------------ */
/* ÜRÜN HAREKETLERİ VE ÜRÜN GEÇMİŞİ — paylaşılan yardımcı fonksiyonlar */
/* ------------------------------------------------------------------ */
// Bir ürünün tüm satış kalemlerini (iskonto, o satıştaki tarihsel maliyet ve
// kâr dahil) en yeniden eskiye sıralı döner.
export const parcaSatisGecmisi = (db, parcaId) =>
  db.satislar
    .filter((s) => s.durum !== "İptal Edildi" && s.kalemler.some((k) => k.parcaId === parcaId))
    .flatMap((s) =>
      s.kalemler
        .filter((k) => k.parcaId === parcaId)
        .map((k) => ({ ...k, tarih: s.tarih, belgeNo: s.id.slice(-6).toUpperCase(), musteri: s.musteriAdi, satisiYapan: s.satisiYapan }))
    )
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

// Bir ürünün TÜM geçmiş olaylarını (stok hareketleri + fiyat değişiklikleri)
// tek, kronolojik bir zaman çizelgesinde birleştirir — "05.08 14:20 → 10
// adet alış yapıldı" tarzı okunabilir satırlar üretir.
export const parcaZamanCizelgesi = (db, parcaId) => {
  const parca = db.parcalar.find((p) => p.id === parcaId);
  if (!parca) return [];
  const olaylar = [];
  db.stokHareketleri
    .filter((h) => h.parcaId === parcaId)
    .forEach((h) => {
      const isaret = h.giris > 0 ? `+${h.giris}` : `-${h.cikis}`;
      olaylar.push({
        tarih: h.tarih,
        aciklama: `${isaret} adet ${h.tur}${h.kullanici ? ` — ${h.kullanici}` : ""}${h.aciklama ? ` (${h.aciklama})` : ""}`,
        renk: h.giris > 0 ? "green" : "red",
      });
    });
  (parca.fiyatGecmisi || []).forEach((f) => {
    olaylar.push({
      tarih: f.tarih,
      aciklama: `Fiyat ${tl(f.eskiFiyat)} → ${tl(f.yeniFiyat)} değişti${f.kullanici ? ` — ${f.kullanici}` : ""}${f.degisiklikNedeni ? ` (${f.degisiklikNedeni})` : ""}`,
      renk: "graphite",
    });
  });
  return olaylar.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
};
