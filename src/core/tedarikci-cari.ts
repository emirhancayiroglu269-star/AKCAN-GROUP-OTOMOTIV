import { isoGun } from "../lib/format";
import { T } from "../lib/theme";

export const satirNetMaliyetHesapla = (k) => (parseFloat(k.birimFiyat) || 0) * (1 - (parseFloat(k.iskontoYuzde) || 0) / 100);

export const satirToplamiHesapla = (k) => satirNetMaliyetHesapla(k) * (parseFloat(k.adet) || 0);

// tedarikciHareketiUygula / cariHareketiUygula / hesapHareketiUygula /
// posKomisyonuHesapla / hesapTransferiUygula / tedarikciHareketleriniGeriAl
// artık ./lib/cari-kasa içinden import ediliyor.

export const bosAlisForm = {
  tedarikci: "",
  faturaNo: "",
  faturaTarihi: isoGun(new Date()),
  vadeTarihi: "",
  odemeDurumu: "Ödendi",
  odenenTutar: "",
  odemeYontemi: "Nakit",
  odemeHesapId: "",
  faturaGirilenToplam: "",
  aciklama: "",
};

/* ------------------------------------------------------------------ */
/* TEDARİKÇİ YÖNETİMİ                                                  */
/* ------------------------------------------------------------------ */
export const bosTedarikciForm = {
  ad: "",
  yetkiliKisi: "",
  telefon: "",
  eposta: "",
  vergiDairesi: "",
  vergiNo: "",
  adres: "",
  odemeVadesiGun: "",
  iskontoOrani: "",
  odemeYontemi: "",
  borcLimiti: "",
  minimumSiparisAdedi: "",
  notlar: "",
  aktif: true,
};

// Tedarikçinin gerçek cari bakiyesi.
// Tahsilat/Ödeme seçiminde açık fatura toplamı kullanılmaz; cari hareketleri
// tek kaynak kabul edilir. Böylece faturası sistemde açık görünse bile cari
// hesabı 0 TL olan tedarikçi ödeme listesine tekrar girmez.
export const tedarikciCariBakiyesiHesapla = (tedarikci) => {
  if (!tedarikci) return 0;
  const hareketler = Array.isArray(tedarikci.hareketler) ? tedarikci.hareketler : [];
  if (hareketler.length === 0) return Math.round((tedarikci.bakiye || 0) * 100) / 100;
  const bakiye = hareketler.reduce((toplam, h) => toplam + (h.tur === "borç" ? (h.tutar || 0) : -(h.tutar || 0)), 0);
  return Math.round(bakiye * 100) / 100;
};

// Bir tedarikçinin açık (kalan borçlu) faturalarını bulur.
// Bu liste yalnızca fatura/tahsis detayında kullanılır; tedarikçinin
// ödeme yapılabilir olup olmadığını belirlemez.
export const tedarikciAcikFaturalari = (db, tedarikciAdi) =>
  db.malAlimlari
    .filter((m) => m.tedarikci.toLowerCase() === tedarikciAdi.toLowerCase())
    .map((m) => ({ ...m, kalanBorc: Math.round(((m.faturaGirilenToplam ?? m.hesaplananGenelToplam) - (m.odenenTutar || 0)) * 100) / 100 }))
    .filter((m) => m.kalanBorc > 0.01);

/* ------------------------------------------------------------------ */
/* MÜŞTERİ / TEDARİKÇİ EKSTRE VE HESAP DÖKÜMÜ                          */
/* ------------------------------------------------------------------ */
export const EKSTRE_TARIH_ARALIGI_HESAPLA = (secim, ozelBaslangic, ozelBitis) => {
  const bugunTarih = new Date();
  const bugunIso = isoGun(bugunTarih);
  if (secim === "hafta") return [isoGun(new Date(Date.now() - 6 * 86400000)), bugunIso];
  if (secim === "ay") return [new Date(bugunTarih.getFullYear(), bugunTarih.getMonth(), 1).toLocaleDateString("en-CA"), bugunIso];
  if (secim === "uc_ay") return [new Date(Date.now() - 90 * 86400000).toLocaleDateString("en-CA"), bugunIso];
  if (secim === "yil") return [new Date(bugunTarih.getFullYear(), 0, 1).toLocaleDateString("en-CA"), bugunIso];
  if (secim === "ozel") return [ozelBaslangic || bugunIso, ozelBitis || bugunIso];
  return [bugunIso, bugunIso]; // "bugun"
};

// 🟢 Vadesi gelmemiş / 🟡 Vadesi yaklaşıyor (7 gün içinde) / 🔴 Vadesi geçmiş.
export const vadeDurumuHesapla = (vadeTarihi) => {
  if (!vadeTarihi) return null;
  const bugunIso = isoGun(new Date());
  const yediGunSonraIso = isoGun(new Date(Date.now() + 7 * 86400000));
  if (vadeTarihi < bugunIso) return { emoji: "🔴", etiket: "Vadesi Geçmiş", renk: T.red };
  if (vadeTarihi <= yediGunSonraIso) return { emoji: "🟡", etiket: "Vadesi Yaklaşıyor", renk: "#8A6110" };
  return { emoji: "🟢", etiket: "Vadesi Gelmemiş", renk: T.green };
};

// Müşteri tarafında (tedarikçiden farklı olarak) her açık hesap satışının
// "ne kadarı ödendi" bilgisi ayrıca tutulmaz — tek bir toplam bakiye vardır.
// Bu fonksiyon, tahsilatları EN ESKİ borçtan başlayarak sırayla düşen bir
