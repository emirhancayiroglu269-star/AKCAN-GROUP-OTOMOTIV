/**
 * AKCAN GROUP OTOMOTİV — ERP varlık (entity) tipleri
 * ---------------------------------------------------
 * `src/lib/database.ts` içindeki `bosVeritabani()` şemasının TypeScript
 * karşılığı. Amaç: `noImplicitAny` açıldığında `db.parcalar.map((p) => ...)`
 * gibi çağrıların parametre tiplerini kaynaktan vermek.
 *
 * TASARIM KURALLARI
 *  1. Alanların hepsi BİLİNÇLİ olarak `optional` yazılmadı; gerçekte her
 *     kayıtta bulunan alanlar zorunlu, eski kayıtlarda bulunmayan alanlar
 *     `?` ile işaretlendi. Böylece tip, şemayı yalan söylemez.
 *  2. Bilinmeyen/ileride eklenecek alanlar için `[anahtar: string]: any`
 *     index signature bırakıldı — bu, geçişi güvenli kılar ve mevcut
 *     dinamik erişimleri kırmaz.
 *  3. Birimler: para alanları `number` (₺), tarih alanları `string`
 *     (ISO 8601, `zamanDamgasi()` / `isoGun()` çıktısı), kimlikler `string`.
 *  4. Bu dosya SADECE tip içerir — çalışma zamanı maliyeti yoktur
 *     (`import type` ile tüketilir).
 */

// ---------------------------------------------------------------------------
// Temel takma adlar
// ---------------------------------------------------------------------------

/** Para tutarı (₺). Yuvarlanmış, 2 ondalıklı. */
export type Para = number;
/** Birim fiyat / maliyet. */
export type Fiyat = number;
/** Varlık kimliği — `yeniId("p")` çıktısı. */
export type Kimlik = string;
/** ISO 8601 tarih-saat (`2026-02-14T19:11:00.000Z`). */
export type ZamanDamgasi = string;
/** ISO 8601 gün (`2026-02-14`). */
export type IsoGun = string;

// ---------------------------------------------------------------------------
// Parça / Ürün
// ---------------------------------------------------------------------------

export type UrunTipi = "Basit" | "Set" | string;
export type SatisBirimSekli = "sadeceTemel" | "paketli" | string;

export interface BarkodKaydi {
  id: Kimlik;
  kod: string;
  /** Bir üründe yalnızca bir barkod birincil olabilir. */
  birincil: boolean;
}

export interface AlisGecmisiKaydi {
  id: Kimlik;
  tarih: ZamanDamgasi;
  adet: number;
  birimFiyat: Fiyat;
  tedarikci?: string;
  belgeNo?: string;
  /** Birim fiyat KDV dahil mi. */
  kdvDahil?: boolean;
}

export interface FiyatGecmisiKaydi {
  id: Kimlik;
  tarih: ZamanDamgasi;
  eskiFiyat: Fiyat | null;
  yeniFiyat: Fiyat;
  neden?: string;
  kullanici?: string;
}

export interface DepoStogu {
  depoId: Kimlik;
  adet: number;
}

export interface SetBileseni {
  parcaId: Kimlik;
  adet: number;
}

export interface PaketBirimi {
  id?: Kimlik;
  ad: string;
  /** Kaç temel birim içerir. */
  carpan: number;
  barkod?: string;
  satisFiyati?: Fiyat;
}

export interface Parca {
  id: Kimlik;
  stokKodu: string;
  ad: string;
  marka: string;
  /** Üretici (OEM) kodu. */
  ureticiKodu?: string;
  /** Birincil barkod — `barkodlar` ile senkron tutulur. */
  barkod?: string;
  barkodlar?: BarkodKaydi[];

  /** Ana kategori ADI (geriye dönük uyumluluk için id değil ad tutulur). */
  anaKategori?: string;
  /** Alt kategori ADI; yoksa ana kategori adı. */
  kategori?: string;
  anaKategoriId?: Kimlik;
  altKategoriId?: Kimlik;
  /** Kategoriye özel serbest alanlar. */
  kategoriOzelDegerler?: Record<string, any>;

  birim?: string;
  /** KDV oranı yüzde olarak (20 = %20). */
  kdvOrani?: number;

  alisFiyati?: Fiyat;
  satisFiyati: Fiyat;
  minimumSatisFiyati?: Fiyat;
  /** En son alış birim fiyatı. */
  sonAlisFiyati?: Fiyat;
  /** Ağırlıklı ortalama maliyet. */
  ortalamaMaliyet?: Fiyat;

  /** Mevcut toplam stok — `depoStoklari` toplamıyla eşit tutulur. */
  stok: number;
  depoStoklari?: DepoStogu[];
  kritikSeviye?: number;
  hedefStok?: number;
  guvenlikStogu?: number;
  siparisteAdet?: number;

  rafAdresi?: string;
  tedarikci?: string;
  aciklama?: string;
  /** Base64 data URL. */
  fotograf?: string;

  aktif: boolean;
  urunTipi?: UrunTipi;
  setBilesenleri?: SetBileseni[];
  paketBirimleri?: PaketBirimi[];
  satisBirimSekli?: SatisBirimSekli;

  alisGecmisi?: AlisGecmisiKaydi[];
  fiyatGecmisi?: FiyatGecmisiKaydi[];

  /** İleride eklenecek alanlar için — geçiş güvenliği. */
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Cari (müşteri) ve Tedarikçi
// ---------------------------------------------------------------------------

export type MusteriTipi = "Bireysel" | "Kurumsal" | string;

export interface CariHareket {
  id: Kimlik;
  tarih: ZamanDamgasi;
  /** "borç" = müşterinin borcu arttı, "ödeme"/"alacak" = azaldı. */
  tur: string;
  tutar: Para;
  aciklama?: string;
  belgeNo?: string;
  kaynakSatisId?: Kimlik;
  kullanici?: string;
  [anahtar: string]: any;
}

export interface Cari {
  id: Kimlik;
  ad: string;
  musteriTipi?: MusteriTipi;
  telefon?: string;
  eposta?: string;
  /** Vergi no veya TC kimlik no. */
  vergiTcNo?: string;
  vergiDairesi?: string;
  adres?: string;
  borcLimiti?: Para;
  /** Vade günü (0 = peşin). */
  vadeGunu?: number;
  iskontoOrani?: number;
  fiyatGrubuId?: Kimlik;
  notlar?: string;
  /** Pozitif = müşteri borçlu, negatif = alacaklı. */
  bakiye: Para;
  hareketler: CariHareket[];
  aktif: boolean;
  [anahtar: string]: any;
}

export interface TedarikciHareket {
  id: Kimlik;
  tarih: ZamanDamgasi;
  tur: string;
  tutar: Para;
  aciklama?: string;
  belgeNo?: string;
  kullanici?: string;
  [anahtar: string]: any;
}

export interface Tedarikci {
  id: Kimlik;
  ad: string;
  yetkili?: string;
  telefon?: string;
  eposta?: string;
  vergiDairesi?: string;
  vergiNo?: string;
  adres?: string;
  /** Ödeme vadesi (gün). */
  odemeVadesiGun?: number;
  iskontoOrani?: number;
  odemeYontemi?: string;
  borcLimiti?: Para;
  minimumSiparisAdedi?: number;
  notlar?: string;
  /** Pozitif = biz borçluyuz. */
  bakiye: Para;
  hareketler: TedarikciHareket[];
  aktif: boolean;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Satış
// ---------------------------------------------------------------------------

export interface SatisKalemi {
  parcaId: Kimlik;
  stokKodu: string;
  ad: string;
  marka?: string;
  birim?: string;
  adet: number;
  birimFiyat: Fiyat;
  /** Satır bazlı iskonto tutarı (₺). */
  iskontoTutari?: Para;
  /** Genel iskontodan bu satıra düşen pay. */
  genelIskontoPayi?: Para;
  kdvOrani: number;
  /** Satış anındaki birim maliyet (kâr raporları bunu kullanır). */
  maliyet?: Fiyat;
  /** "Normal Fiyat" | "Kampanya: ..." | "Müşteri Özel Fiyat" vb. */
  fiyatKaynagi?: string;
  [anahtar: string]: any;
}

export interface OdemeSatiri {
  id?: Kimlik;
  yontem: string;
  tutar: Para;
  hesapId?: Kimlik;
  posId?: Kimlik;
  [anahtar: string]: any;
}

export interface EFaturaBilgisi {
  durum: string;
  eFaturaNo: string | null;
}

export type SatisDurumu = "Tamamlandı" | "İptal Edildi" | "İade Edildi" | string;

export interface Satis {
  id: Kimlik;
  /** "ST-2026-000001" gibi sıralı, tekrar kullanılmaz belge no. */
  belgeNo: string;
  tarih: ZamanDamgasi;
  musteriAdi: string;
  musteriId: Kimlik | null;
  satisiYapan: string;
  belgeTuru?: string;
  kalemler: SatisKalemi[];
  genelIskontoTutari?: Para;
  araToplam: Para;
  iskontoToplam?: Para;
  kdvToplam: Para;
  genelToplam: Para;
  odemeler?: OdemeSatiri[];
  not?: string;
  durum: SatisDurumu;
  eFatura?: EFaturaBilgisi;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Stok hareketi
// ---------------------------------------------------------------------------

export interface StokHareketi {
  id: Kimlik;
  parcaId: Kimlik;
  tarih: ZamanDamgasi;
  /** "Perakende Satış", "Mal Alış", "Devir / Açılış Stoğu", "Sayım" … */
  tur: string;
  belgeNo: string;
  giris: number;
  cikis: number;
  /** Hareket sonrası kalan stok — denetim izi. */
  kalanStok: number;
  kullanici: string;
  aciklama: string;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Kasa / Banka / POS
// ---------------------------------------------------------------------------

export type HesapTuru = "kasa" | "banka" | "pos" | string;

export interface Hesap {
  id: Kimlik;
  ad: string;
  tur: HesapTuru;
  bakiye: Para;
  banka?: string;
  iban?: string;
  aktif: boolean;
  [anahtar: string]: any;
}

export interface KasaIslemi {
  id: Kimlik;
  tarih: ZamanDamgasi;
  yon: "tahsilat" | "odeme" | string;
  tarafId?: Kimlik;
  tarafAdi?: string;
  tutar: Para;
  aciklama?: string;
  belgeNo?: string;
  kullanici?: string;
  hesapSatirlari?: Array<{ hesapId: Kimlik; tutar: Para; yontem?: string }>;
  faturaTahsisleri?: Array<{ faturaId: Kimlik; tutar: Para }>;
  [anahtar: string]: any;
}

export interface PosCihazi {
  id: Kimlik;
  ad: string;
  banka?: string;
  terminalNo?: string;
  hesapId?: Kimlik;
  komisyonOrani?: number;
  aktif: boolean;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Mal alımı / satın alma
// ---------------------------------------------------------------------------

export interface MalAlimi {
  id: Kimlik;
  tedarikci: string;
  faturaNo: string;
  faturaTarihi: IsoGun;
  vadeTarihi?: IsoGun;
  faturaGirilenToplam?: Para;
  hesaplananGenelToplam?: Para;
  odenenTutar?: Para;
  odemeDurumu?: string;
  odemeYontemi?: string;
  hesapId?: Kimlik | null;
  kalemler?: Array<{ parcaId: Kimlik; adet: number; birimFiyat: Fiyat; [k: string]: any }>;
  aciklama?: string;
  kullanici?: string;
  olusturmaTarihi?: ZamanDamgasi;
  [anahtar: string]: any;
}

export interface SatinAlmaSiparisi {
  id: Kimlik;
  tedarikci: string;
  tarih: ZamanDamgasi;
  durum: string;
  kalemler: Array<{ parcaId: Kimlik; adet: number; birimFiyat?: Fiyat; [k: string]: any }>;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Depo / raf / transfer
// ---------------------------------------------------------------------------

export interface Depo {
  id: Kimlik;
  ad: string;
  adres?: string;
  aktif: boolean;
  [anahtar: string]: any;
}

export interface Transfer {
  id: Kimlik;
  tarih: ZamanDamgasi;
  kaynakDepoId: Kimlik;
  hedefDepoId: Kimlik;
  kalemler: Array<{ parcaId: Kimlik; adet: number }>;
  kullanici?: string;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Kategori / marka / araç uyumluluğu
// ---------------------------------------------------------------------------

export interface Kategori {
  id: Kimlik;
  ad: string;
  /** Üst kategori yoksa null/undefined — kök kategoridir. */
  ustKategoriId?: Kimlik | null;
  [anahtar: string]: any;
}

export interface Marka {
  id: Kimlik;
  ad: string;
  logo?: string;
  aktif?: boolean;
  [anahtar: string]: any;
}

export interface Arac {
  id: Kimlik;
  marka: string;
  model: string;
  yilBaslangic: number;
  yilBitis: number;
  aktif: boolean;
  [anahtar: string]: any;
}

export interface Uyumluluk {
  id: Kimlik;
  parcaId: Kimlik;
  aracId: Kimlik;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Vardiya / gün sonu
// ---------------------------------------------------------------------------

export interface Vardiya {
  id: Kimlik;
  kullanici: string;
  acilisZamani: ZamanDamgasi;
  kapanisZamani?: ZamanDamgasi | null;
  /** "Açık" | "Kapandı" */
  durum: string;
  acilisKasa?: Para;
  kapanisKasa?: Para;
  /** Sayılan ile beklenen arasındaki fark (₺). */
  kasaFarki?: Para | null;
  [anahtar: string]: any;
}

export interface GunSonu {
  id: Kimlik;
  tarih: IsoGun;
  ciro: Para;
  nakit: Para;
  kart: Para;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Kullanıcı / rol / denetim
// ---------------------------------------------------------------------------

export interface Rol {
  id: Kimlik;
  ad: string;
  yetkiler: Record<string, boolean>;
  [anahtar: string]: any;
}

export interface Kullanici {
  id: Kimlik;
  ad: string;
  kullaniciAdi?: string;
  rolId: Kimlik;
  aktif: boolean;
  sifreHash?: string;
  [anahtar: string]: any;
}

export interface IslemGecmisiKaydi {
  id: Kimlik;
  tarih: ZamanDamgasi;
  kullaniciAdi: string;
  islemTuru: string;
  aciklama?: string;
  eskiDeger?: any;
  yeniDeger?: any;
  [anahtar: string]: any;
}

export interface AuditGecmisiKaydi {
  id: Kimlik;
  tarih: ZamanDamgasi;
  kullaniciAdi: string;
  kategori: string;
  islemTuru: string;
  aciklama?: string;
  eskiDeger?: string;
  yeniDeger?: string;
  hedefId?: string;
  /** Hash zinciri — bir önceki kaydın hash'i. */
  oncekiHash?: string;
  hash?: string;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Fiyatlandırma / kampanya / teklif
// ---------------------------------------------------------------------------

export interface MusteriFiyatGrubu {
  id: Kimlik;
  ad: string;
  iskontoOrani?: number;
  [anahtar: string]: any;
}

export interface FiyatGrubuKurali {
  id: Kimlik;
  grupId: Kimlik;
  [anahtar: string]: any;
}

export interface Kampanya {
  id: Kimlik;
  ad: string;
  ton?: string;
  baslangicTarihi: IsoGun;
  bitisTarihi: IsoGun;
  aktif: boolean;
  [anahtar: string]: any;
}

export interface TeklifKalemi {
  parcaId: Kimlik;
  ad?: string;
  adet: number;
  birimFiyat: Fiyat;
  [anahtar: string]: any;
}

export interface Teklif {
  id: Kimlik;
  belgeNo?: string;
  tarih: ZamanDamgasi;
  musteriAdi: string;
  musteriId?: Kimlik | null;
  kalemler: TeklifKalemi[];
  toplam?: Para;
  /** "Taslak" | "Gönderildi" | "Onaylandı" | "Reddedildi" | "İptal" */
  durum: string;
  gecerlilikTarihi?: IsoGun;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Rezerv / sipariş / iade
// ---------------------------------------------------------------------------

export interface Rezerv {
  id: Kimlik;
  tarih: ZamanDamgasi;
  musteriAdi: string;
  musteriTelefon?: string;
  parcaId: Kimlik;
  adet: number;
  fiyat?: Fiyat;
  durum: string;
  [anahtar: string]: any;
}

export interface MusteriSiparisi {
  id: Kimlik;
  tarih: ZamanDamgasi;
  musteriAdi: string;
  musteriTelefon?: string;
  parcaId: Kimlik;
  adet: number;
  siparisFiyati?: Fiyat;
  durum: string;
  [anahtar: string]: any;
}

export interface Iade {
  id: Kimlik;
  tarih: ZamanDamgasi;
  kaynakSatisId: Kimlik;
  belgeNo?: string;
  tutar: Para;
  kapatmaYontemi?: string;
  [anahtar: string]: any;
}

// ---------------------------------------------------------------------------
// Veritabanı kökü
// ---------------------------------------------------------------------------

/**
 * `bosVeritabani()` şemasının tip karşılığı.
 *
 * Not: Tüm koleksiyonlar `T[]` — kod tabanı boyunca `.filter/.map/.find`
 * zincirleri bunu bekler. Yeni bir koleksiyon eklendiğinde hem
 * `bosVeritabani()` hem bu arayüz güncellenmelidir.
 */
export interface VeriTabani {
  parcalar: Parca[];
  kodlar: Array<{ id: Kimlik; parcaId: Kimlik; tip: "OEM" | "Muadil" | string; kod: string; [k: string]: any }>;
  satislar: Satis[];
  cariler: Cari[];
  tedarikciler: Tedarikci[];
  stokHareketleri: StokHareketi[];
  kasaIslemleri: KasaIslemi[];
  hesaplar: Hesap[];
  posCihazlari: PosCihazi[];
  posTahsilatlari: any[];
  giderler: any[];
  tekrarlayanGiderler: any[];
  giderKategorileri: any[];
  malAlimlari: MalAlimi[];
  satinAlmaSiparisleri: SatinAlmaSiparisi[];
  depolar: Depo[];
  transferler: Transfer[];
  musteriSiparisleri: MusteriSiparisi[];
  iceAktarmaSablonlari: any[];
  musteriNotlari: any[];
  tedarikciNotlari: any[];
  gunSonlari: GunSonu[];
  vardiyalar: Vardiya[];
  teklifler: Teklif[];
  etiketYazdirmaGecmisi: any[];
  kargoFirmalari: any[];
  teslimatlar: any[];
  tedarikciTeklifleri: any[];
  entegrasyonlar: any[];
  entegrasyonLoglari: any[];
  entegrasyonKuyrugu: any[];
  bildirimSablonlari: any[];
  disBildirimGecmisi: any[];
  kasaGunleri: any[];
  iadeler: Iade[];
  alisIadeleri: any[];
  rafHareketleri: any[];
  topluFiyatIslemleri: any[];
  sayimlar: any[];
  roller: Rol[];
  kullanicilar: Kullanici[];
  islemGecmisi: IslemGecmisiKaydi[];
  girisGecmisi: any[];
  auditGecmisi: AuditGecmisiKaydi[];
  yedekAyarlari: any;
  yedekGecmisi: any[];
  kategoriler: Kategori[];
  markalar: Marka[];
  araclar: Arac[];
  uyumluluklar: Uyumluluk[];
  rezervler: Rezerv[];
  favoriler: any[];
  musteriFiyatGruplari: MusteriFiyatGrubu[];
  fiyatGrubuKurallari: FiyatGrubuKurali[];
  musteriOzelFiyatlar: any[];
  kampanyalar: Kampanya[];
  belgeSayaclari: Record<string, number>;
  magazaBilgileri: any;
  ayarlar: any;
  hedefKarAyari: any;
  [anahtar: string]: any;
}
