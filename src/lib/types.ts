export type ID = string;

export interface Urun {
  id: ID; kod?: string | null; barkod?: string | null; ad: string; marka?: string | null; kategori?: string | null;
  birim: string; alis_fiyati: number; satis_fiyati: number; kdv: number; stok: number; kritik_stok: number;
  /** analizde fatura fiyatı kullanılıyorsa: kartta yazan asıl alış ve faturanın bilgisi (yalnız istemcide) */
  kart_alis?: number;
  /** BizimHesap kartındaki etiket alanı (OEM / muadil kodları, virgülle) */
  etiket?: string | null; alis_fatura?: { tarih: string; tedarikci: string | null };
  raf?: string | null; aktif: boolean; olusturma?: string; bh_id?: string | null; bh_guncelleme?: string | null; bh_stok?: number | null;
}

export interface Depo { id: ID; ad: string; bh_id?: string | null; aktif: boolean }
export interface UrunDepoStok { urun_id: ID; depo_id: ID; miktar: number }

export interface BhDurum {
  id: 1; son_esitleme?: string | null; son_hata?: string | null; urun_sayisi?: number | null; depo_sayisi?: number | null;
  cari_sayisi?: number | null; takip_baslangic?: string | null; ham_ornek?: Record<string, unknown> | null;
  rapor_ilk?: string | null; rapor_son?: string | null; rapor_yukleme?: string | null; masraf_son?: string | null;
}

/** Stok değişiminden türetilen hareket: stok azaldıysa satış, arttıysa alış */
export interface Hareket {
  id: number; tarih: string; urun_id: ID; tur: 'satis' | 'alis'; miktar: number; onceki?: number | null; sonraki?: number | null;
  satis_fiyati: number; alis_fiyati: number; kdv: number; yok_say: boolean; notlar?: string | null;
  /** fatura: BizimHesap ürün alış-satış raporundan gerçek satır · stok: stok değişiminden tahmin */
  kaynak?: 'fatura' | 'stok'; urun_ad?: string | null;
  /** stok dışı alış satırı aynı tutarla masraf olarak da girilmiş (çift sayılmasın) */
  cift_kayit?: boolean;
  belge_guid?: string | null; cari_guid?: string | null; cari_ad?: string | null; kullanici?: string | null; depo?: string | null; saat?: string | null;
  /** fatura satırı: indirimden önceki tutar ve satır indirimi (ikisi de KDV hariç) */
  brut?: number; indirim?: number;
}
export interface KasaAkisi { id: number; tarih: string; tip?: string | null; hesap?: string | null; kullanici?: string | null; karsi?: string | null; aciklama?: string | null; giris: number; cikis: number }
export interface HesapBakiye { ad: string; bakiye: number; guncelleme?: string }
export interface VadesiGecen { id: number; cari: string; telefon?: string | null; tutar: number; gun?: number | null; yuklendi?: string }
export interface Masraf { id: number; tarih: string; odeme_tarihi?: string | null; durum?: string | null; ana?: string | null; alt?: string | null; hesap?: string | null; aciklama?: string | null; tutar: number }
export interface TahsilatNot { id: ID; cari: string; cari_guid?: string | null; tur: 'not' | 'arama' | 'mesaj' | 'soz'; metin?: string | null; soz_tarih?: string | null; soz_tutar?: number | null; durum?: 'acik' | 'tutuldu' | 'tutulmadi' | null; kullanici?: string | null; olusturma?: string }
/** 'siparis': Alınacaklar'dan verilen tedarikçi siparişi (baslangic_deger = sipariş adedi, fiyat = birim alış; planlandi = yolda, yapildi = geldi) */
export type StokAksiyonTur = 'iade' | 'kampanya' | 'toplu' | 'beklet' | 'siparis';
export interface StokAksiyon { id: ID; urun_id: ID; aksiyon: StokAksiyonTur; fiyat?: number | null; tedarikci?: string | null; durum: 'planlandi' | 'yapildi' | 'vazgecildi'; notlar?: string | null; baslangic_stok?: number | null; baslangic_deger?: number | null; kullanici?: string | null; olusturma?: string; guncelleme?: string | null }
export interface FiyatGecmisi { id: number; tarih: string; urun_id: ID; alis_eski: number; alis_yeni: number; satis_eski: number; satis_yeni: number }

export interface Cari {
  id: ID; bh_id: string; tur: 'musteri' | 'tedarikci'; ad: string; kod?: string | null; telefon?: string | null; eposta?: string | null;
  vergi_no?: string | null; vergi_dairesi?: string | null; adres?: string | null; bakiye: number; cek_senet: number; bh_guncelleme?: string;
}
export interface CariHareket { id: number; tarih: string; cari_id: ID; onceki: number; sonraki: number; fark: number }

export type Rol = 'yonetici' | 'kasiyer' | 'teknisyen';
export const ROL_AD: Record<Rol, string> = { yonetici: 'Yönetici', kasiyer: 'Personel', teknisyen: 'Depo' };
export interface Kullanici { id: ID; eposta: string; ad?: string | null; rol: Rol; aktif: boolean; olusturma?: string }

export interface UrunKodu { id: ID; urun_id: ID; kod: string; kod_norm?: string; tur: 'OEM' | 'Muadil' | string }

export interface Ayarlar {
  id: 1; firma_adi: string; adres?: string | null; telefon?: string | null; vergi?: string | null; fis_notu?: string | null;
  alis_kdv_haric?: boolean; hedef_gun?: number; haric_masraf?: string[]; hedef_marj?: number; hedef_ciro?: number; kategori_marj?: Record<string, number>; tahsilat_hedef?: number; stok_eritme_hedef?: number; kampanya_oran?: number; usta_liste?: { indirim: number; taban: number; kategoriler: string[]; sadeceStok: boolean } | null;
  /** personel primi: kâr üzerinden oran (%) ve kişi başı aylık satış hedefi */ personel_prim?: { oran: number; hedefler: Record<string, number> } | null;
  /** Trendyol fiyat hesabı varsayımları */ trendyol?: { komisyon: number; kargo: number; hizmet: number; stopaj: number; hedef_marj: number; stok_gonder?: boolean; guvenlik?: number } | null;
}

export interface DB {
  urunler: Urun[]; depolar: Depo[]; urun_depo_stok: UrunDepoStok[]; bh_durum: BhDurum | null;
  hareketler: Hareket[]; fiyat_gecmisi: FiyatGecmisi[]; cariler: Cari[]; cari_hareketler: CariHareket[];
  ayarlar: Ayarlar; kullanicilar: Kullanici[]; urun_kodlari: UrunKodu[]; masraflar: Masraf[];
  kasa_akisi: KasaAkisi[]; hesap_bakiyeleri: HesapBakiye[]; vadesi_gecen: VadesiGecen[]; tahsilat_notlari: TahsilatNot[]; stok_aksiyon: StokAksiyon[];
  /** BizimHesap stok değişimlerinin ham hali (faturayla birleştirilmeden); kayıp-kaçak kontrolü için */
  stok_degisim?: Hareket[];
  /** Otomarmara B4B'den ihtiyaç anında çekilen OEM / eşdeğer bilgisi */
  otomarmara_veri?: OtomarmaraVeri[];
  /** iade belgeleri: tur 'alis' = tedarikçiye iade (stoktan çıkar), 'satis' = müşteriden iade (stoğa girer) */
  iadeler?: Hareket[];
}

export interface OtomarmaraVeri {
  urun_id: ID; durum: 'istendi' | 'tamam' | 'bulunamadi' | 'hata'; istendi: string; guncelleme: string | null;
  om_kod: string | null; om_ad: string | null; oemler: string[]; esdegerler: { kod: string; ad?: string | null }[]; hata: string | null;
}

export type CrudTable = 'urunler' | 'urun_kodlari' | 'kullanicilar' | 'hareketler' | 'tahsilat_notlari' | 'stok_aksiyon';
