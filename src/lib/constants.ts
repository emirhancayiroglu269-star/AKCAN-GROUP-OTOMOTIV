import { yeniId, zamanDamgasi } from "./format";
import { auditKaydiEkle } from "./audit-log";

export const STORAGE_KEY = "akcan-veritabani-v1";

export const BIRIMLER = ["Adet", "Takım", "Set", "Çift", "Kutu", "Litre", "Metre", "Kilogram"];
export const URUN_TIPLERI = ["Basit", "Set", "Stoksuz"];
export const KDV_ORANLARI = [0, 1, 10, 20];
export const KOD_TIPLERI = ["OEM", "Muadil"];
export const ODEME_YONTEMLERI = ["Nakit", "Kredi Kartı", "Havale/EFT", "Açık Hesap"];
export const ALIS_ODEME_DURUMLARI = ["Ödendi", "Vadeli", "Kısmi"];
// Kâr marjı oranı bu eşiğin altındaysa (maliyetin üstünde olsa bile) "düşük
// kâr" uyarısı gösterilir — satışçı farkında olmadan neredeyse kârsız satış
// yapmasın diye. Maliyetin TAMAMEN altındaki satış ayrıca ve her zaman
// engellenir (yönetici onayı gerektirir), bu eşikten bağımsızdır.
export const DUSUK_KAR_ESIGI_YUZDE = 10;

// Stok hareket türleri — giriş ve çıkış olarak ayrı tutulur; "Manuel Stok
// Düzeltme" ekranında sadece bu listeden bir sebep seçilebilir, elle stok
// adedi yazılamaz. Mal Alış / Perakende Satış / Satış İadesi / Devir gibi
// türler programın kendisi tarafından otomatik oluşturulur.
export const STOK_GIRIS_TURLERI = ["Sayım Fazlası", "Manuel Stok Girişi"];
export const STOK_CIKIS_TURLERI = ["Alış İadesi", "Sayım Eksiği", "Hasarlı / Fire Ürün", "Manuel Stok Çıkışı"];

// Yetkilendirme sistemindeki tüm tekil yetkiler — hem rol matrisinde hem
// tek tek kontrol noktalarında (yetkiVarMi) bu anahtarlar kullanılır.
export const YETKI_TANIMLARI = [
  { anahtar: "satisYapabilir", etiket: "Satış yapabilir" },
  { anahtar: "satisIptalEdebilir", etiket: "Satış iptal edebilir" },
  { anahtar: "iadeAlabilir", etiket: "İade alabilir" },
  { anahtar: "iskontoYapabilir", etiket: "İskonto yapabilir" },
  { anahtar: "satisFiyatiDegistirebilir", etiket: "Satış fiyatını (POS'ta) değiştirebilir" },
  { anahtar: "maliyetiGorebilir", etiket: "Maliyeti görebilir" },
  { anahtar: "karOraniniGorebilir", etiket: "Kâr oranını görebilir" },
  { anahtar: "minimumAltiSatisYapabilir", etiket: "Minimum fiyat altında satış yapabilir" },
  { anahtar: "stokDuzeltebilir", etiket: "Stok düzeltebilir" },
  { anahtar: "malAlisGirebilir", etiket: "Mal alış girebilir" },
  { anahtar: "alisFiyatiniGorebilir", etiket: "Alış fiyatını görebilir" },
  { anahtar: "cariHesapGorebilir", etiket: "Cari hesap (müşteri/tedarikçi) görebilir" },
  { anahtar: "tahsilatGirebilir", etiket: "Tahsilat girebilir" },
  { anahtar: "kasaGorebilir", etiket: "Kasa görebilir" },
  { anahtar: "kasaCikisiYapabilir", etiket: "Kasa çıkışı (gider/ödeme) yapabilir" },
  { anahtar: "raporlariGorebilir", etiket: "Raporları görebilir" },
  { anahtar: "fiyatDegistirebilir", etiket: "Ürün kartında fiyat değiştirebilir" },
  { anahtar: "urunSilebilir", etiket: "Ürün silebilir" },
  { anahtar: "kullaniciYonetebilir", etiket: "Kullanıcı/yetki yönetebilir" },
];

export const hepsi = (deger) => Object.fromEntries(YETKI_TANIMLARI.map((y) => [y.anahtar, deger]));

// Hazır roller — yönetici bunları sonradan tek tek düzenleyebilir (yetkiler
// açılıp kapatılabilir), sadece "sabit" olanlar silinemez.
export const VARSAYILAN_ROLLER = () => [
  { id: "rol-yonetici", ad: "Yönetici", sabit: true, yetkiler: hepsi(true), maksimumIskontoYuzdesi: null },
  {
    id: "rol-satis",
    ad: "Satış Personeli",
    sabit: true,
    yetkiler: { ...hepsi(false), satisYapabilir: true, iskontoYapabilir: true, cariHesapGorebilir: true, iadeAlabilir: true },
    maksimumIskontoYuzdesi: 10,
  },
  {
    id: "rol-kasa",
    ad: "Kasa",
    sabit: true,
    yetkiler: { ...hepsi(false), satisYapabilir: true, tahsilatGirebilir: true, kasaGorebilir: true, kasaCikisiYapabilir: true, cariHesapGorebilir: true },
    maksimumIskontoYuzdesi: 10,
  },
  {
    id: "rol-depo",
    ad: "Depo",
    sabit: true,
    yetkiler: { ...hepsi(false), stokDuzeltebilir: true, malAlisGirebilir: true },
    maksimumIskontoYuzdesi: 0,
  },
];

// Müşteri fiyat grupları için başlangıç seti.
export const VARSAYILAN_FIYAT_GRUPLARI = () =>
  ["Perakende", "Usta", "Servis", "Toptan", "Özel Müşteri"].map((ad) => ({ id: yeniId("fg"), ad, aciklama: "" }));

// Ana kategori + alt kategori taksonomisi için başlangıç seti. Tek düz
// listede tutulur (ustKategoriId boşsa ana kategori); kullanıcı bunları
// sonradan Kategoriler modülünden dilediği gibi düzenleyebilir/ekleyebilir.
export const VARSAYILAN_KATEGORILER = () => {
  const anaAdlari = [
    "Motor", "Filtre", "Fren", "Süspansiyon", "Direksiyon", "Debriyaj", "Elektrik", "Aydınlatma",
    "Soğutma", "Yakıt Sistemi", "Klima", "Aktarma", "Kaporta", "Silecek", "Yağ / Sıvılar", "Aksesuar", "Diğer",
  ];
  const kategoriler = anaAdlari.map((ad) => ({ id: yeniId("kat"), ad, ustKategoriId: null, aktif: true, ozelAlanlar: [] }));
  const frenId = kategoriler.find((k) => k.ad === "Fren").id;
  const filtreId = kategoriler.find((k) => k.ad === "Filtre").id;

  // Filtre için, tüm alt tiplerine ortak geçerli özel alanlar ana kategoride tanımlanır.
  kategoriler.find((k) => k.id === filtreId).ozelAlanlar = [
    { id: yeniId("oa"), ad: "Filtre Tipi", tip: "metin" },
    { id: yeniId("oa"), ad: "Uzunluk (mm)", tip: "sayi" },
    { id: yeniId("oa"), ad: "Çap (mm)", tip: "sayi" },
    { id: yeniId("oa"), ad: "Yükseklik (mm)", tip: "sayi" },
  ];

  const frenAltlari = ["Fren Balatası", "Fren Diski", "Fren Kampanası", "Fren Merkezi", "Fren Hortumu", "Fren Sensörü", "Fren Tamir Takımı"];
  const filtreAltlari = ["Yağ Filtresi", "Hava Filtresi", "Polen Filtresi", "Yakıt Filtresi", "Şanzıman Filtresi"];

  frenAltlari.forEach((ad) => {
    const ozelAlanlar =
      ad === "Fren Balatası"
        ? [
            { id: yeniId("oa"), ad: "Ön / Arka", tip: "metin" },
            { id: yeniId("oa"), ad: "Fren Sistemi", tip: "metin" },
            { id: yeniId("oa"), ad: "Uzunluk (mm)", tip: "sayi" },
            { id: yeniId("oa"), ad: "Genişlik (mm)", tip: "sayi" },
          ]
        : [];
    kategoriler.push({ id: yeniId("kat"), ad, ustKategoriId: frenId, aktif: true, ozelAlanlar });
  });
  filtreAltlari.forEach((ad) => kategoriler.push({ id: yeniId("kat"), ad, ustKategoriId: filtreId, aktif: true, ozelAlanlar: [] }));

  return kategoriler;
};

// Başlangıç marka listesi — dilenildiği kadar eklenip düzenlenebilir.
export const VARSAYILAN_MARKALAR = () =>
  ["MANN-FILTER", "MAHLE", "BOSCH", "FILTRON", "FEBI", "SACHS", "LUK"].map((ad) => ({
    id: yeniId("mrk"),
    ad,
    kod: "",
    logo: "",
    aciklama: "",
    mensei: "",
    aktif: true,
    grup: "",
    not: "",
    fiyatKurali: null,
  }));

// Başlangıç gider kategorileri — kullanıcı dilediği kadar yenisini ekleyebilir.
export const VARSAYILAN_GIDER_KATEGORILERI = () =>
  [
    "Kira", "Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon", "Kargo", "Nakliye", "Akaryakıt",
    "Kırtasiye", "Temizlik", "Personel", "Banka/POS Komisyonu", "Muhasebe", "Vergi", "Bakım/Onarım", "Diğer",
  ].map((ad) => ({ id: yeniId("gk"), ad }));

// Sabit id'li tek başlangıç deposu — "depo-ana" id'si sabit tutulur ki
// veriyiOnar her yüklemede aynı varsayılan depoyu güvenilir şekilde bulabilsin.
export const VARSAYILAN_DEPOLAR = () => [{ id: "depo-ana", ad: "Ana Mağaza", kod: "D1", adres: "", sorumluKisi: "", aktif: true }];

// Örnek araç tanımları — tam kullanıcının verdiği "VW Golf 7 1.6 TDI" örneği
// ve onun yaygın muadil platformlarıyla (Passat/Jetta/A3/Octavia) başlar.
export const VARSAYILAN_ARACLAR = () =>
  [
    { marka: "Volkswagen", model: "Golf", kasa: "7", yilBaslangic: 2013, yilBitis: 2017, motor: "1.6 TDI", motorKodu: "CXXB", yakit: "Dizel", guc: "110 HP" },
    { marka: "Volkswagen", model: "Passat", kasa: "B8", yilBaslangic: 2014, yilBitis: 2019, motor: "1.6 TDI", motorKodu: "CXXB", yakit: "Dizel", guc: "120 HP" },
    { marka: "Volkswagen", model: "Jetta", kasa: "6", yilBaslangic: 2010, yilBitis: 2018, motor: "1.6 TDI", motorKodu: "CAYC", yakit: "Dizel", guc: "105 HP" },
    { marka: "Audi", model: "A3", kasa: "8V", yilBaslangic: 2012, yilBitis: 2020, motor: "1.6 TDI", motorKodu: "CXXB", yakit: "Dizel", guc: "110 HP" },
    { marka: "Skoda", model: "Octavia", kasa: "5E", yilBaslangic: 2013, yilBitis: 2020, motor: "1.6 TDI", motorKodu: "CXXB", yakit: "Dizel", guc: "105 HP" },
  ].map((a) => ({ id: yeniId("arac"), aktif: true, ...a }));

// Bir kullanıcının belirli bir yetkiye sahip olup olmadığını, bağlı olduğu
// rol üzerinden kontrol eder. Henüz giriş yapılmamışsa (aktifKullanici=null,
// örn. kullanıcı sistemi daha kurulmadan önceki geçiş dönemi) tüm kontroller
// serbest bırakılır — böylece mevcut tek-kullanıcılı akışlar kırılmaz.
export const yetkiVarMi = (db, aktifKullanici, anahtar) => {
  if (!aktifKullanici) return true;
  const rol = db.roller.find((r) => r.id === aktifKullanici.rolId);
  return !!(rol && rol.yetkiler[anahtar]);
};

// Bir işlemi (kim/ne/ne zaman/eski→yeni) kalıcı ve silinemez şekilde
// işlem geçmişine kaydeder.
export const islemKaydet = (prev, { kullaniciAdi, islemTuru, aciklama, eskiDeger, yeniDeger, hedefId = null, islemId = null, kategori = null, sonuc = "Başarılı" }) => {
  const kayit = { id: yeniId("ig"), tarih: zamanDamgasi(), kullaniciAdi: kullaniciAdi || "", islemTuru, aciklama, eskiDeger, yeniDeger };
  const sonraki = { ...prev, islemGecmisi: [kayit, ...(Array.isArray(prev.islemGecmisi) ? prev.islemGecmisi : [])].slice(0, 5000) };
  return auditKaydiEkle(sonraki, { kullaniciAdi, islemTuru, aciklama, eskiDeger, yeniDeger, hedefId, islemId, kategori: kategori || undefined, sonuc });
};

// Hızlı İşlem Merkezi klavye kısayolları — Ayarlar → Sistem'den değiştirilebilir.
export const VARSAYILAN_KISAYOLLAR = {
  yeniSatis: "F1",
  urunAra: "F2",
  musteriAra: "F3",
  yeniMusteri: "F4",
  yeniUrun: "F5",
  tahsilat: "F6",
  alis: "F7",
  odeme: "F8",
  satisiTamamla: "F9",
  kasa: "F10",
};

export const BELGE_TUR_ONEKLERI = { "Satış Fişi": "ST", Fatura: "FT", İrsaliye: "IR", "Tahsilat Makbuzu": "TM", "İade Belgesi": "IA", Teklif: "TK" };
export const BELGE_TURLERI = Object.keys(BELGE_TUR_ONEKLERI);
