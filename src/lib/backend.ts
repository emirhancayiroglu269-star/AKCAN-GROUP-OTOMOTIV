import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Ayarlar, BhDurum, Cari, CrudTable, DB, Hareket, HesapBakiye, ID, KasaAkisi, Masraf, OtomarmaraVeri, Urun, UrunKodu, VadesiGecen } from './types';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './baglanti';
import { onbellekOku, onbellekYaz, onbellekSil } from './onbellek';

/** ürünlerde BizimHesap'ın ham JSON'u (bh_ham) çok büyük ve sitede kullanılmıyor: çekilmez */
const URUN_KOLON = 'id,kod,barkod,ad,marka,kategori,birim,alis_fiyati,satis_fiyati,kdv,stok,kritik_stok,raf,aktif,olusturma,bh_id,bh_guncelleme,bh_stok,degisim,gorsel_var';
const ONBELLEK_ANAHTAR = 'ham'; const ONBELLEK_SURUM = 2; // 2: urunler.gorsel_var eklendi
/** çıkışta önbellek silinir (ortak bilgisayarda veri kalmasın) */
export const onbellekTemizle = () => onbellekSil(ONBELLEK_ANAHTAR);

const URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL;
const KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const MODE: 'bulut' | 'demo' = supabase ? 'bulut' : 'demo';

export interface OmAramaSonuc { id: string; kod: string; marka: string; ad: string; ek: string[]; depolar?: { ad: string; durum: 'var' | 'yok' | 'tedarik' | null }[]; fiyat?: { taksit: number | null; tekCekim: number | null; nakit: number | null } | null }
export interface NekoSonuc { id: number; kod: string; ad: string; uretici: string | null; stok: number | null; stokDurum: string | null; var: boolean; resim: string | null; liste: number | null; net: number | null; netKdv: number | null; iskonto: string | null; doviz: string | null }
export interface NekoYanit { sonuclar: NekoSonuc[]; zaman: string; onbellek: boolean; maliyet: boolean }
export interface NekoToplu { kod: string; adet?: number; ayni?: boolean; en?: NekoSonuc | null; stoktaSayisi?: number; hata?: string; yarim?: boolean }
export interface OmAramaYanit { sonuclar: OmAramaSonuc[]; zaman: string; onbellek: boolean }
export interface OmDetayYanit { oemler: string[]; esdegerler: { kod: string; ad?: string | null }[]; zaman: string; onbellek: boolean }
export interface EsitlemeSonucu { ok: boolean; hata?: string; urun?: number; depo?: number; degisen?: number; stokSatiri?: number; cari?: number }

export interface Backend {
  /** Tarayıcı önbelleği varsa yalnız değişen satırları çeker (24 saatte bir tam yükleme) */
  load(): Promise<DB>;
  /** önbellekteki son veri (açılışta beklemeden göstermek için); yoksa null */
  onbellektenDB(): Promise<DB | null>;
  /** Otomarmara verisinde verilen zamandan sonra değişen satırlar ve o ürünlerin OTOMARMARA kodları */
  omDegisen(son: string): Promise<{ veri: OtomarmaraVeri[]; kodlar: UrunKodu[] }>;
  insert<T extends object>(t: CrudTable, row: T): Promise<void>;
  update<T extends object>(t: CrudTable, id: ID | number, patch: Partial<T>): Promise<void>;
  remove(t: CrudTable, id: ID): Promise<void>;
  ayarKaydet(a: Partial<Ayarlar>): Promise<void>;
  bhEsitle(): Promise<EsitlemeSonucu>;
  urunKodlariYukle(satirlar: { anahtar: string; kodlar: string[]; tur: string }[]): Promise<{ eklenen: number; bulunamayan: number }>;
  /** Otomarmara'dan OEM/eşdeğer isteği (Otomarmara sekmesindeki betik işler) */
  omIste(urunIdler: ID[]): Promise<void>;
  subscribe(onChange: () => void, onOm?: () => void): () => void;
  /** yalnız Otomarmara verisini oku (arka plan servisi sık yazdığı için tüm veri yeniden yüklenmez) */
  omVeri(): Promise<OtomarmaraVeri[]>;
  /** Otomarmara'da canlı arama (yalnız okuma; sunucu fonksiyonu üzerinden, önbellekli) */
  omAra(q: string): Promise<OmAramaYanit>;
  nekoAra(q: string): Promise<NekoYanit>;
  nekoEsdeger(id: number): Promise<NekoYanit>;
  nekoToplu(kodlar: string[]): Promise<NekoToplu[]>;
  /** Otomarmara'daki bir ürünün OEM ve eşdeğer listesi */
  omDetay(id: string): Promise<OmDetayYanit>;
  /** Hafif kontrol: verinin değişip değişmediğini anlamak için tek satır okur */
  durum(): Promise<{ son_esitleme?: string | null; imza: string } | null>;
  /** Stok sayımı (yalnız bu sitede tutulur; BizimHesap'a yazılmaz) */
  sayimOku(depoId: ID): Promise<SayimSatir[]>;
  sayimKaydet(r: SayimSatir): Promise<void>;
  sayimSil(depoId: ID, urunId?: ID): Promise<void>;
  /** Sorulan ama stokta olmayan parçalar (kaçan satış) */
  sorulanEkle(r: Omit<Sorulan, 'id' | 'zaman'>): Promise<void>;
  sorulanOku(sonGun: number): Promise<Sorulan[]>;
  sorulanSil(id: number): Promise<void>;
  /** Ürün Ara'dan verilen fiyat teklifleri */
  teklifKaydet(r: Omit<FiyatTeklifi, 'id' | 'zaman' | 'durum' | 'durum_zaman'>): Promise<number | null>;
  teklifOku(sonGun: number): Promise<FiyatTeklifi[]>;
  teklifGuncelle(id: number, p: Partial<FiyatTeklifi>): Promise<void>;
  /** Trendyol: ilanlar, son N günün sipariş paketleri ve durum (yalnız sayfa açılınca okunur) */
  tyOku(sonGun: number): Promise<TyVeri>;
  /** Trendyol sunucu fonksiyonu: 'test' bağlantıyı dener, 'esitle' siparişleri ve ilanları çeker */
  tyCalistir(islem: 'test' | 'esitle' | 'stok_gonder'): Promise<Record<string, unknown>>;
  tyGonderimOku(tur?: 'stok' | 'fiyat'): Promise<TyGonderim[]>;
  tyFiyatSupheli(): Promise<TyFiyatSupheli[]>;
  /** Tedarikçi (Otomarmara / Neko) güncel alış fiyatları — yalnız yönetici okuyabilir */
  tedarikciMaliyet(): Promise<TedarikciMaliyet[]>;
  /** Tarayıcı eklentisinin (Iron) kayıt anahtarı — yalnız yönetici */
  eklentiAnahtar(): Promise<string | null>;
  /** Trendyol sunucu fonksiyonunda serbest işlem (kategori/marka arama, özellikler, eşleşme kaydı, ürün yükleme) */
  tyIslem<T = Record<string, unknown>>(govde: Record<string, unknown>): Promise<T>;
  tyEslemeOku(): Promise<{ kategori: TyKategoriEsleme[]; marka: TyMarkaEsleme[]; yukleme: TyYukleme[] }>;
  tyOtoOzet(): Promise<TyOtoOzet>;
  sorulanRafa(gun: number): Promise<SorulanRafa[]>;
  rakipNotKaydet(url: string, n: { satin_aldi: number | null; sepette: number | null; inceledi: number | null }): Promise<void>;
  rakipPazar(zorla?: boolean): Promise<{ urunler: RakipUrun[]; sayfa: number; taranan: number; son: string | null }>;
  urunGorselleri(ids: ID[]): Promise<Map<ID, string[]>>;
}
export interface TyUrun { barkod: string; stok_kodu: string | null; baslik: string | null; marka: string | null; kategori: string | null; satis_fiyati: number | null; liste_fiyati: number | null; stok: number | null; kdv: number | null; satista: boolean | null; urun_id: ID | null; guncelleme: string; kategori_id?: number | null; komisyon?: number | null; desi?: number | null }
export interface TySatir { barkod: string | null; stok_kodu: string | null; ad: string | null; adet: number; birim_fiyat: number | null; brut: number | null; indirim: number; satici_indirim: number; komisyon: number | null; kdv: number | null; durum: string | null }
export interface TySiparis { paket_id: string; siparis_no: string | null; tarih: string | null; son_degisim: string | null; durum: string | null; sehir: string | null; toplam: number | null; indirim: number | null; kargo_firma: string | null; kargo_takip: string | null; satirlar: TySatir[] }
export interface TyDurum { son_urun: string | null; son_siparis: string | null; son_hata: string | null; urun_sayisi: number | null; siparis_sayisi: number | null }
export interface TyGonderim { id: number; zaman: string; barkod: string; baslik: string | null; eski: number | null; yeni: number; durum: string; hata: string | null; kaynak: string | null; fiyat_eski?: number | null; fiyat_yeni?: number | null }
export interface TyFiyatSupheli { barkod: string; baslik: string | null; eski: number; hedef: number; neden: string }
export interface TedarikciMaliyet { urun_id: string; tedarikci: 'otomarmara' | 'neko' | 'iron' | 'basbug' | 'ozas'; kod: string | null; fiyat: number; stok_var: boolean | null; zaman: string }
export interface TyOzellikDeger { attributeId: number; attributeValueId?: number | null; customAttributeValue?: string | null; ad?: string; deger?: string }
export interface TyKategoriEsleme { bh_kategori: string; ty_kategori_id: number; ty_kategori_ad: string | null; ozellikler: TyOzellikDeger[]; desi: number | null }
export interface TyMarkaEsleme { bh_marka: string; ty_marka_id: number; ty_marka_ad: string | null }
export interface SorulanRafa { anahtar: string; metin: string; kod_norm: string; kez: number; adet: number; son: string; urun_id: ID | null; bizim_ad: string | null; bizim_stok: number | null; rakip_url: string | null; rakip_ad: string | null; rakip_uretici: string | null; rakip_fiyat: number | null; rakip_stokta: boolean | null; rakip_kategori: string | null }
export interface RakipUrun { url: string; ad: string | null; uretici: string | null; kod: string | null; fiyat: number | null; stokta: boolean | null; kategori: string | null; puan: number; gorulme: number; araclar: string[]; urun_id: ID | null; bizim_ad: string | null; bizim_stok: number | null; bizim_fiyat: number | null; satin_aldi?: number | null; sepette?: number | null; inceledi?: number | null; soruldu?: number; eslesme?: 'ayni' | 'muadil' | null }
export interface TyOtoOzet { aday: number; duzenli: number; bugun: number; eslesmemis: { tur: 'marka' | 'kategori'; ad: string; adet: number }[]; atlanan: { urun_id: ID; ad: string; neden: string; zaman: string }[] }
export interface TyYukleme { id: number; zaman: string; urun_id: ID | null; barkod: string; baslik: string | null; fiyat: number | null; stok: number | null; durum: string; hata: string | null }
export interface TyVeri { urunler: TyUrun[]; siparisler: TySiparis[]; durum: TyDurum | null }
export interface TeklifSatiri { urun_id: ID; ad: string; marka?: string | null; adet: number; fiyat: number; ekonomik?: boolean }
export interface FiyatTeklifi { id: number; zaman: string; musteri: string | null; arac: string | null; kalemler: TeklifSatiri[]; toplam: number; kullanici: string | null; durum: 'acik' | 'satildi' | 'kaybedildi'; durum_zaman: string | null; notlar?: string | null }
export interface Sorulan { id: number; zaman: string; metin: string; urun_id: ID | null; kullanici: string | null; adet: number }
export interface SayimSatir { depo_id: ID; urun_id: ID; sayilan: number; sistem: number | null; kullanici: string | null; zaman?: string }

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const NUMS: Record<string, string[]> = {
  urunler: ['alis_fiyati', 'satis_fiyati', 'kdv', 'stok', 'kritik_stok'],
  urun_depo_stok: ['miktar'],
  hareketler: ['miktar', 'onceki', 'sonraki', 'satis_fiyati', 'alis_fiyati', 'kdv'],
  rapor_satirlari: ['miktar', 'alis_fiyati', 'tutar', 'indirim', 'net', 'kdv', 'toplam', 'birim_fiyat', 'kdv_orani'],
  masraflar: ['tutar'], kasa_akisi: ['giris', 'cikis'], hesap_bakiyeleri: ['bakiye'], vadesi_gecen: ['tutar'],
  fiyat_gecmisi: ['alis_eski', 'alis_yeni', 'satis_eski', 'satis_yeni'],
  tahsilat_notlari: ['soz_tutar'], stok_aksiyon: ['fiyat', 'baslangic_stok', 'baslangic_deger'],
  cariler: ['bakiye', 'cek_senet'], cari_hareketler: ['onceki', 'sonraki', 'fark'],
};
function norm<T>(t: string, rows: T[]): T[] {
  const f = NUMS[t] || [];
  return rows.map((r) => { const o = { ...(r as Record<string, unknown>) }; f.forEach((k) => (o[k] = num(o[k]))); if (t === 'urunler' && o.bh_stok != null) o.bh_stok = Number(o.bh_stok); return o as T; });
}

interface RaporSatiri { id: number; tarih: string; tur: 'satis' | 'alis'; iade?: boolean; urun_id: ID | null; urun_ad: string | null; miktar: number; alis_fiyati: number; net: number; kdv: number; toplam: number; tutar?: number | null; indirim?: number | null;
  kdv_orani?: number | null; belge_guid?: string | null; cari_guid?: string | null; cari_ad?: string | null; kullanici?: string | null; depo?: string | null; saat?: string | null }

/** Rapor (gerçek fatura) satırlarını harekete çevirir; rapor olan günlerde stok tahminini kullanmaz */
function hareketleriBirlestir(stok: Hareket[], rapor: RaporSatiri[], d: BhDurum | null, urunler: Urun[], masraf: Masraf[] = []): Hareket[] {
  const son = d?.rapor_son ?? null;
  const fiyat = new Map(urunler.map((u) => [u.id, u]));
  const yerelGun = (s: string) => new Date(s).toLocaleDateString('sv');
  const r: Hareket[] = rapor.filter((x) => x.miktar > 0 && !x.iade).map((x) => {
    const kdvOran = x.kdv_orani != null ? Number(x.kdv_orani) : x.net > 0 && x.kdv > 0 ? Math.round((x.kdv / x.net) * 100) : (x.urun_id ? fiyat.get(x.urun_id)?.kdv ?? 20 : 20);
    return {
      id: -x.id, tarih: `${x.tarih}T${x.saat ? String(x.saat).slice(0, 5) : '12:00'}:00`,
      belge_guid: x.belge_guid, cari_guid: x.cari_guid, cari_ad: x.cari_ad, kullanici: x.kullanici, depo: x.depo, saat: x.saat ? String(x.saat).slice(0, 5) : null, urun_id: x.urun_id ?? `yok:${x.urun_ad}`, tur: x.tur, miktar: x.miktar,
      satis_fiyati: x.tur === 'satis' ? x.toplam / x.miktar : (x.urun_id ? fiyat.get(x.urun_id)?.satis_fiyati ?? 0 : 0),
      // satış anında kartta alış yoksa (0) ve kart sonradan düzeltildiyse güncel kart alışı kullanılır
      alis_fiyati: x.tur === 'satis' ? x.alis_fiyati || (x.urun_id ? fiyat.get(x.urun_id)?.alis_fiyati ?? 0 : 0) || 0 : x.net / x.miktar,
      kdv: kdvOran, yok_say: false, kaynak: 'fatura', urun_ad: x.urun_ad, brut: x.tutar ?? undefined, indirim: x.indirim ?? undefined,
      cift_kayit: x.tur === 'alis' && !x.urun_id && masraf.some((m) => Math.abs(m.tutar - x.toplam) < 1 && Math.abs(new Date(m.tarih).getTime() - new Date(x.tarih).getTime()) <= 5 * 864e5),
    };
  });
  const s = stok.filter((h) => !son || yerelGun(h.tarih) > son).map((h) => ({ ...h, kaynak: 'stok' as const }));
  return [...s, ...r].sort((a, b) => b.tarih.localeCompare(a.tarih));
}

async function omCagir(sb: SupabaseClient, body: object, fn = 'otomarmara-ara') {
  const { data, error } = await sb.functions.invoke(fn, { body });
  if (error) {
    let mesaj = error.message;
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.hata) mesaj = j.hata; } catch { /* yok */ }
    throw new Error(mesaj);
  }
  return data;
}

// ======================= SUPABASE =======================
function supabaseBackend(sb: SupabaseClient): Backend {
  const ok = <T,>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };

  // ---------- artımlı yükleme ----------
  type Ham = Record<string, unknown[]>;
  interface HamOnbellek { surum: number; zaman: number; tablolar: Ham; son: Record<string, string>; sonSil: string | null }
  interface Izlenen { t: string; k: string[]; order: string; asc: boolean; sinir: number; gecersiz?: boolean }
  /** her yüklemede tamamen çekilen küçük tablolar */
  const KUCUK: [string, string, boolean, number, [string, boolean]?][] = [
    ['depolar', 'olusturma', true, 50000], ['cariler', 'ad', true, 50000], ['cari_hareketler', 'tarih', false, 50000], ['kullanicilar', 'olusturma', true, 50000],
    ['hesap_bakiyeleri', 'ad', true, 50000], ['vadesi_gecen', 'tutar', false, 10000, ['gecersiz', false]], ['tahsilat_notlari', 'olusturma', false, 50000], ['stok_aksiyon', 'olusturma', false, 50000],
  ];
  /** büyük tablolar: yalnız "degisim" zamanı son yüklemeden sonra olanlar çekilir, silinenler "silinen" günlüğünden düşülür */
  const IZLENEN: Izlenen[] = [
    { t: 'urunler', k: ['id'], order: 'olusturma', asc: false, sinir: 50000 }, { t: 'urun_depo_stok', k: ['urun_id', 'depo_id'], order: 'urun_id', asc: true, sinir: 200000 },
    { t: 'hareketler', k: ['id'], order: 'tarih', asc: false, sinir: 200000 }, { t: 'fiyat_gecmisi', k: ['id'], order: 'tarih', asc: false, sinir: 50000 },
    { t: 'urun_kodlari', k: ['id'], order: 'olusturma', asc: true, sinir: 200000 }, { t: 'rapor_satirlari', k: ['id'], order: 'tarih', asc: false, sinir: 300000, gecersiz: true },
    { t: 'masraflar', k: ['id'], order: 'tarih', asc: false, sinir: 100000, gecersiz: true }, { t: 'kasa_akisi', k: ['id'], order: 'tarih', asc: false, sinir: 200000, gecersiz: true },
    { t: 'otomarmara_veri', k: ['urun_id'], order: 'urun_id', asc: true, sinir: 100000 },
  ];
  const anahtar = (z: Izlenen, r: unknown) => z.k.map((k) => String((r as Record<string, unknown>)[k])).join('|');
  /** 2 dk geri (o anda süren yazma işlemleri için örtüşme; aynı satırın tekrar gelmesi zararsız, kaçan olursa 24 saatlik tam yükleme düzeltir) */
  // (veritabanı zamanı mikrosaniyeli gelir: iPhone tarayıcısı için milisaniyeye kısaltılır)
  const geri = (iso: string) => { const t = new Date(iso.replace(/(\.\d{3})\d+/, '$1')).getTime(); return new Date((Number.isFinite(t) ? t : 0) - 2 * 60000).toISOString(); };
  async function degisenler(z: Izlenen, son: string | undefined) {
    if (!son) return hepsi(z.t, z.order, z.asc, z.sinir, z.gecersiz ? ['gecersiz', false] : undefined);
    const kolon = z.t === 'urunler' ? URUN_KOLON + ',etiket' : '*'; const l: unknown[] = [];
    for (let i = 0; i < z.sinir; i += 1000) {
      let q = sb.from(z.t).select(kolon).gt('degisim', geri(son)).order('degisim', { ascending: true });
      for (const k of z.k) q = q.order(k, { ascending: true });
      const d = ok(await q.range(i, i + 999)) as unknown[]; l.push(...d); if (d.length < 1000) break;
    }
    return norm(z.t, l);
  }

  /** Supabase sorgu başına en fazla 1000 satır döndürür; tamamını sayfa sayfa çeker. */
  async function hepsi(t: string, order: string, asc = false, sinir = 50000, filtre?: [string, boolean], degil?: [string, string]) {
    const sayfa = 1000; const sonuc: unknown[] = [];
    for (let i = 0; i < sinir; i += sayfa) {
      // ürünlerde BizimHesap'ın ham JSON'u (bh_ham) çok büyük ve sitede kullanılmıyor: çekilmez
      const URUN = URUN_KOLON;
      // sayfalama kararlı olsun: sıralama sütunu tekrarlı olabildiğinden (ör. aynı anda eklenen ürünler) benzersiz ikinci sıralama eklenir; yoksa sayfalar arasında kayıt tekrarlanır ya da atlanır
      const ikinci = t === 'urun_depo_stok' ? 'depo_id' : t === 'hesap_bakiyeleri' || t === 'otomarmara_veri' ? null : 'id';
      const sor = (kolon: string) => { let q = sb.from(t).select(kolon); if (filtre) q = q.eq(filtre[0], filtre[1]); if (degil) q = q.neq(degil[0], degil[1]); q = q.order(order, { ascending: asc }); if (ikinci && ikinci !== order) q = q.order(ikinci, { ascending: true }); return q.range(i, i + sayfa - 1); };
      // etiket (OEM/muadil kodları): bh_ham içindeki tag alanının veritabanında hazır tutulan kopyası (ham JSON her seferinde açılmaz); okunamazsa onsuz devam edilir
      let r = await sor(t === 'urunler' ? URUN + ',etiket' : '*');
      if (r.error && t === 'urunler') r = await sor(URUN);
      const d = ok(r) as unknown[];
      sonuc.push(...d);
      if (d.length < sayfa) break;
    }
    return norm(t, sonuc);
  }

  return {
    async load() {
      // Önbellek varsa yalnız değişen satırlar çekilir; 3 günde bir (ya da önbellek yoksa) her şey baştan
      const once = await onbellekOku<HamOnbellek>(ONBELLEK_ANAHTAR);
      // tam yükleme 3 günde bir (silinen günlüğü 7 gün tutulur)
      const gecerli = !!once && once.surum === ONBELLEK_SURUM && Date.now() - once.zaman < 72 * 3600e3 && !!once.son;
      const ham: Ham = {}; const sonlar: Record<string, string> = {}; let sonSil = gecerli ? once!.sonSil : null; let degisti = !gecerli;
      if (!gecerli) {
        // silinen günlüğünün şu anki ucu: bundan sonraki silmeler sonraki yüklemelerde uygulanır
        const sl = await sb.from('silinen').select('zaman').order('zaman', { ascending: false }).limit(1);
        sonSil = (sl.data?.[0] as { zaman?: string } | undefined)?.zaman ?? '1970-01-01T00:00:00Z';
      }
      const kucuk = await Promise.all(KUCUK.map(([t, o, a, sn, f]) => hepsi(t, o, a, sn, f)));
      KUCUK.forEach(([t], i) => { ham[t] = kucuk[i]; });
      const [bd, a] = await Promise.all([
        sb.from('bh_durum').select('id,son_esitleme,son_hata,urun_sayisi,depo_sayisi,cari_sayisi,takip_baslangic,rapor_ilk,rapor_son,rapor_yukleme,masraf_son').eq('id', 1).maybeSingle(),
        sb.from('ayarlar').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (gecerli) {
        // silinenler (2 dk örtüşmeyle; uygulamak tekrar zararsız)
        const sil: { tablo: string; kayit: string; zaman: string }[] = [];
        for (let i = 0; i < 200000; i += 1000) { const d = ok(await sb.from('silinen').select('tablo,kayit,zaman').gt('zaman', geri(sonSil!)).order('id').range(i, i + 999)) as typeof sil; sil.push(...d); if (d.length < 1000) break; }
        const silinecek = new Map<string, Set<string>>(); for (const x of sil) { (silinecek.get(x.tablo) ?? silinecek.set(x.tablo, new Set()).get(x.tablo)!).add(x.kayit); if (x.zaman > sonSil!) sonSil = x.zaman; }
        const degisen = await Promise.all(IZLENEN.map((z) => degisenler(z, once!.son[z.t])));
        if (sil.length || degisen.some((d) => d.length)) degisti = true;
        IZLENEN.forEach((z, i) => {
          const m = new Map((once!.tablolar[z.t] ?? []).map((r) => [anahtar(z, r), r]));
          for (const k of silinecek.get(z.t) ?? []) m.delete(k);
          let enSon = once!.son[z.t];
          for (const r of degisen[i]) { m.set(anahtar(z, r), r); const d = (r as { degisim?: string }).degisim; if (d && d > enSon) enSon = d; }
          const l = z.gecersiz ? [...m.values()].filter((r) => !(r as { gecersiz?: boolean }).gecersiz) : [...m.values()];
          // tam yüklemedeki sıra korunsun (sıralama sütunu, eşitlikte anahtar)
          const ss = (r: unknown) => String((r as Record<string, unknown>)[z.order] ?? ''); const yon = z.asc ? 1 : -1;
          ham[z.t] = l.sort((x, y) => { const a = ss(x), b = ss(y); return a < b ? -yon : a > b ? yon : anahtar(z, x) < anahtar(z, y) ? -1 : 1; });
          sonlar[z.t] = enSon;
        });
      } else {
        const tam = await Promise.all(IZLENEN.map((z) => hepsi(z.t, z.order, z.asc, z.sinir, z.gecersiz ? ['gecersiz', false] : undefined).catch((e) => { if (z.t === 'otomarmara_veri') return []; throw e; })));
        IZLENEN.forEach((z, i) => { ham[z.t] = tam[i]; sonlar[z.t] = tam[i].reduce<string>((m, r) => { const d = (r as { degisim?: string }).degisim ?? ''; return d > m ? d : m; }, '1970-01-01T00:00:00Z'); });
      }
      ham.bh_durum = [ok(bd)]; ham.ayarlar = [ok(a)];
      // önbelleğe yaz (beklemeden; yalnız bir şey değiştiyse — her seferinde ≈20 MB yazmak telefonu yorar)
      if (degisti) onbellekYaz(ONBELLEK_ANAHTAR, { surum: ONBELLEK_SURUM, zaman: gecerli ? once!.zaman : Date.now(), tablolar: ham, son: sonlar, sonSil } satisfies HamOnbellek).catch(() => undefined);
      return hamdanDB(ham);
    },
    async onbellektenDB() {
      const o = await onbellekOku<HamOnbellek>(ONBELLEK_ANAHTAR);
      try { return o && o.surum === ONBELLEK_SURUM && o.tablolar?.urunler ? hamdanDB(o.tablolar) : null; } catch { return null; }
    },
    async insert(t, row) { ok(await sb.from(t).insert(row)); },
    async update(t, id, patch) { ok(await sb.from(t).update(patch as never).eq('id', id)); },
    async remove(t, id) { ok(await sb.from(t).delete().eq('id', id)); },
    async ayarKaydet(a) { ok(await sb.from('ayarlar').upsert({ ...a, id: 1 })); },
    async urunKodlariYukle(satirlar) { return ok(await sb.rpc('urun_kodlari_yukle', { p: satirlar })) as { eklenen: number; bulunamayan: number }; },
    async omVeri() { return (await hepsi('otomarmara_veri', 'urun_id', true, 100000)) as OtomarmaraVeri[]; },
    async omDegisen(son) {
      // yalnız değişen satırlar (servis her dakika yazar; tamamını her seferinde çekmek aylık veri sınırını zorluyordu)
      const veri: OtomarmaraVeri[] = [];
      for (let i = 0; i < 20000; i += 1000) {
        const d = ok(await sb.from('otomarmara_veri').select('*').or(`guncelleme.gt.${son},istendi.gt.${son}`).order('urun_id').range(i, i + 999)) as OtomarmaraVeri[];
        veri.push(...d); if (d.length < 1000) break;
      }
      const ids = veri.filter((v) => v.durum !== 'istendi').map((v) => v.urun_id); const kodlar: UrunKodu[] = [];
      for (let i = 0; i < ids.length; i += 100) kodlar.push(...(ok(await sb.from('urun_kodlari').select('*').eq('tur', 'OTOMARMARA').in('urun_id', ids.slice(i, i + 100)).limit(10000)) as UrunKodu[]));
      return { veri, kodlar };
    },
    async omAra(q) { return omCagir(sb, { q }) as Promise<OmAramaYanit>; },
    async nekoAra(q) { return omCagir(sb, { q }, 'neko-ara') as Promise<NekoYanit>; },
    async nekoEsdeger(id) { return omCagir(sb, { islem: 'esdeger', id }, 'neko-ara') as Promise<NekoYanit>; },
    async nekoToplu(kodlar) { return ((await omCagir(sb, { islem: 'toplu', kodlar }, 'neko-ara')) as { sonuclar: NekoToplu[] }).sonuclar; },
    async sayimOku(depoId) {
      const r: SayimSatir[] = [];
      for (let i = 0; i < 100000; i += 1000) { const d = ok(await sb.from('sayim').select('depo_id,urun_id,sayilan,sistem,kullanici,zaman').eq('depo_id', depoId).order('urun_id').range(i, i + 999)) as SayimSatir[]; r.push(...d.map((x) => ({ ...x, sayilan: Number(x.sayilan), sistem: x.sistem === null ? null : Number(x.sistem) }))); if (d.length < 1000) break; }
      return r;
    },
    async sorulanEkle(r) { ok(await sb.from('sorulan').insert(r)); },
    async sorulanOku(sonGun) {
      const bas = new Date(Date.now() - sonGun * 864e5).toISOString(); const r: Sorulan[] = [];
      for (let i = 0; i < 50000; i += 1000) { const d = ok(await sb.from('sorulan').select('id,zaman,metin,urun_id,kullanici,adet').gte('zaman', bas).order('id').range(i, i + 999)) as Sorulan[]; r.push(...d); if (d.length < 1000) break; }
      return r;
    },
    async sorulanSil(id) { ok(await sb.from('sorulan').delete().eq('id', id)); },
    async teklifKaydet(r) { const d = ok(await sb.from('fiyat_teklifleri').insert(r).select('id').single()) as { id: number }; return d?.id ?? null; },
    async teklifOku(sonGun) {
      const bas = new Date(Date.now() - sonGun * 864e5).toISOString(); const r: FiyatTeklifi[] = [];
      for (let i = 0; i < 20000; i += 1000) { const d = ok(await sb.from('fiyat_teklifleri').select('*').gte('zaman', bas).order('id', { ascending: false }).range(i, i + 999)) as FiyatTeklifi[]; r.push(...d.map((x) => ({ ...x, toplam: Number(x.toplam) }))); if (d.length < 1000) break; }
      return r;
    },
    async teklifGuncelle(id, p) { ok(await sb.from('fiyat_teklifleri').update(p).eq('id', id)); },
    async tyOku(sonGun) {
      const urunler: TyUrun[] = []; const siparisler: TySiparis[] = []; const bas = new Date(Date.now() - sonGun * 864e5).toISOString();
      for (let i = 0; i < 100000; i += 1000) { const d = ok(await sb.from('ty_urun').select('barkod,stok_kodu,baslik,marka,kategori,satis_fiyati,liste_fiyati,stok,kdv,satista,urun_id,guncelleme,kategori_id,komisyon,desi').order('barkod').range(i, i + 999)) as TyUrun[]; urunler.push(...d); if (d.length < 1000) break; }
      for (let i = 0; i < 100000; i += 1000) { const d = ok(await sb.from('ty_siparis').select('paket_id,siparis_no,tarih,son_degisim,durum,sehir,toplam,indirim,kargo_firma,kargo_takip,satirlar').gte('tarih', bas).order('tarih', { ascending: false }).range(i, i + 999)) as TySiparis[]; siparisler.push(...d); if (d.length < 1000) break; }
      const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
      const durum = ok(await sb.from('ty_durum').select('son_urun,son_siparis,son_hata,urun_sayisi,siparis_sayisi').eq('id', 1).maybeSingle()) as TyDurum | null;
      return { urunler: urunler.map((x) => ({ ...x, satis_fiyati: n(x.satis_fiyati), liste_fiyati: n(x.liste_fiyati), stok: n(x.stok), kdv: n(x.kdv), komisyon: n(x.komisyon) })), siparisler: siparisler.map((x) => ({ ...x, toplam: n(x.toplam), indirim: n(x.indirim) })), durum };
    },
    async tyGonderimOku(tur = 'stok') { return (ok(await sb.from('ty_gonderim').select('id,zaman,barkod,baslik,eski,yeni,durum,hata,kaynak,fiyat_eski,fiyat_yeni').eq('tur', tur).order('id', { ascending: false }).limit(100)) as TyGonderim[]).map((x) => ({ ...x, eski: x.eski === null ? null : Number(x.eski), yeni: Number(x.yeni), fiyat_eski: x.fiyat_eski == null ? null : Number(x.fiyat_eski), fiyat_yeni: x.fiyat_yeni == null ? null : Number(x.fiyat_yeni) })); },
    async eklentiAnahtar() { const d = ok(await sb.from('eklenti_anahtar').select('anahtar').eq('id', 1).maybeSingle()) as { anahtar: string } | null; return d?.anahtar ?? null; },
    async tedarikciMaliyet() {
      const out: TedarikciMaliyet[] = [];
      for (let i = 0; i < 20000; i += 1000) { const d = ok(await sb.from('tedarikci_maliyet').select('urun_id,tedarikci,kod,fiyat,stok_var,zaman').not('fiyat', 'is', null).order('urun_id').order('tedarikci').range(i, i + 999)) as TedarikciMaliyet[]; out.push(...d); if (d.length < 1000) break; }
      return out;
    },
    async tyFiyatSupheli() { const d = ok(await sb.from('ty_onbellek').select('veri').eq('anahtar', 'fiyat_supheli').maybeSingle()) as { veri: TyFiyatSupheli[] } | null; return d?.veri ?? []; },
    async tyIslem(govde) {
      const { data, error } = await sb.functions.invoke('trendyol', { body: govde });
      if (error) { let mesaj = error.message; try { const j = await (error as { context?: Response }).context?.json(); if (j?.hata) mesaj = j.hata; } catch { /* yok */ } throw new Error(mesaj); }
      if ((data as { ok?: boolean })?.ok === false) throw new Error(String((data as { hata?: string }).hata ?? 'Trendyol işlemi başarısız'));
      return data as never;
    },
    async tyEslemeOku() {
      const k = ok(await sb.from('ty_kategori_esleme').select('bh_kategori,ty_kategori_id,ty_kategori_ad,ozellikler,desi')) as TyKategoriEsleme[];
      const m = ok(await sb.from('ty_marka_esleme').select('bh_marka,ty_marka_id,ty_marka_ad')) as TyMarkaEsleme[];
      const y = ok(await sb.from('ty_yukleme').select('id,zaman,urun_id,barkod,baslik,fiyat,stok,durum,hata').order('id', { ascending: false }).limit(200)) as TyYukleme[];
      return { kategori: k.map((x) => ({ ...x, desi: x.desi === null ? null : Number(x.desi) })), marka: m, yukleme: y.map((x) => ({ ...x, fiyat: x.fiyat === null ? null : Number(x.fiyat), stok: x.stok === null ? null : Number(x.stok) })) };
    },
    async tyOtoOzet() { const { data, error } = await sb.rpc('ty_oto_ozet'); if (error) throw new Error(error.message); return data as TyOtoOzet; },
    async sorulanRafa(gun) {
      const { data, error } = await sb.rpc('sorulan_rafa', { gun }); if (error) throw new Error(error.message);
      return ((data ?? []) as SorulanRafa[]).map((x) => ({ ...x, bizim_stok: x.bizim_stok == null ? null : Number(x.bizim_stok), rakip_fiyat: x.rakip_fiyat == null ? null : Number(x.rakip_fiyat) }));
    },
    async rakipNotKaydet(url, n) {
      const { data: k } = await sb.auth.getUser();
      ok(await sb.from('rakip_not').upsert({ url, ...n, guncelleme: new Date().toISOString(), kullanici: k?.user?.email ?? null }));
    },
    async rakipPazar(zorla = false) {
      // pazar listesi sunucuda yarım saatte bir yenilenir: tarayıcıda 30 dk saklanır (veri çıkışı kotası için)
      const AN = 'rakip_pazar_v3';
      if (!zorla) { try { const o = JSON.parse(localStorage.getItem(AN) ?? 'null'); if (o && Date.now() - o.t < 30 * 60000) return o.v; } catch { /* yok */ } }
      const v = await (async () => {
      // sunucu tek seferde en fazla 1000 satır verir: 3 parça halinde
      const parcalar = await Promise.all([0, 1, 2].map((i) => sb.rpc('rakip_pazar3', { n: 3000 }).range(i * 1000, i * 1000 + 999)));
      const hata = parcalar.find((p) => p.error); if (hata?.error) throw new Error(hata.error.message);
      const data = parcalar.flatMap((p) => (p.data ?? []) as RakipUrun[]);
      const { count: sayfa } = await sb.from('rakip_sayfa').select('url', { count: 'exact', head: true });
      const { count: taranan } = await sb.from('rakip_sayfa').select('url', { count: 'exact', head: true }).not('son_tarama', 'is', null);
      const { data: son } = await sb.from('rakip_sayfa').select('son_tarama').not('son_tarama', 'is', null).order('son_tarama', { ascending: false }).limit(1).maybeSingle();
      const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
      return { urunler: ((data ?? []) as RakipUrun[]).map((x) => ({ ...x, fiyat: n(x.fiyat), puan: Number(x.puan), bizim_stok: n(x.bizim_stok), bizim_fiyat: n(x.bizim_fiyat) })), sayfa: sayfa ?? 0, taranan: taranan ?? 0, son: (son?.son_tarama as string) ?? null };
      })();
      try { localStorage.setItem(AN, JSON.stringify({ t: Date.now(), v })); } catch { /* yer yok */ }
      return v;
    },
    async urunGorselleri(ids) {
      const m = new Map<ID, string[]>();
      for (let i = 0; i < ids.length; i += 100) {
        const d = ok(await sb.from('urunler').select('id,foto:bh_ham->>photo').in('id', ids.slice(i, i + 100))) as { id: ID; foto: string | null }[];
        for (const x of d) { try { const l = JSON.parse(x.foto ?? '[]') as { PhotoUrl?: string; PhotoUrlOriginal?: string }[]; m.set(x.id, l.map((p) => p.PhotoUrlOriginal ?? p.PhotoUrl ?? '').filter((u) => /^https:\/\//.test(u))); } catch { m.set(x.id, []); } }
      }
      return m;
    },
    async tyCalistir(islem) {
      const { data, error } = await sb.functions.invoke('trendyol', { body: { islem, ilan: true, gun: 30 } });
      if (error) { let mesaj = error.message; try { const j = await (error as { context?: Response }).context?.json(); if (j?.hata) mesaj = j.hata; } catch { /* yok */ } throw new Error(mesaj); }
      return data as Record<string, unknown>;
    },
    async sayimKaydet(r) { ok(await sb.from('sayim').upsert({ ...r, zaman: new Date().toISOString() }, { onConflict: 'depo_id,urun_id' })); },
    async sayimSil(depoId, urunId) { let q = sb.from('sayim').delete().eq('depo_id', depoId); if (urunId) q = q.eq('urun_id', urunId); ok(await q); },
    async omDetay(id) { return omCagir(sb, { id }) as Promise<OmDetayYanit>; },
    async omIste(ids) {
      if (!ids.length) return; const t = new Date().toISOString();
      ok(await sb.from('otomarmara_veri').upsert(ids.map((id) => ({ urun_id: id, durum: 'istendi', istendi: t, oncelik: 1 })), { onConflict: 'urun_id' }));
      // sunucu hemen işlemeye başlasın (cron da 2 dakikada bir bakar); yanıt beklenmez
      sb.functions.invoke('otomarmara-muadil', { body: {} }).catch(() => undefined);
    },
    async bhEsitle() {
      const { data, error } = await sb.functions.invoke('bizimhesap-esitle', { body: {} });
      if (error) {
        let mesaj = error.message;
        try { const j = await (error as { context?: Response }).context?.json(); if (j?.hata) mesaj = j.hata; } catch { /* yok */ }
        return { ok: false, hata: mesaj };
      }
      return data as EsitlemeSonucu;
    },
    subscribe(onChange, onOm) {
      let timer: ReturnType<typeof setTimeout> | undefined; let omTimer: ReturnType<typeof setTimeout> | undefined;
      const fire = () => { clearTimeout(timer); timer = setTimeout(onChange, 1500); };
      const ch = sb.channel('degisiklikler');
      // BizimHesap eşitlemesinin yazdığı tablolar burada yok: onlar durum() ile 30 sn'de bir kontrol edilir
      ['ayarlar', 'kullanicilar', 'tahsilat_notlari', 'stok_aksiyon'].forEach((t) =>
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire));
      // urun_kodlari ve otomarmara_veri canlı yayında değil (Otomarmara servisi dakikada onlarca satır yazıyor; her biri açık her sekmeye
      // gidince aylık veri kotası zorlanıyordu). Bu tablolar 3 dakikalık artımlı yenilemede gelir; kullanıcının istediği ürün store'da ayrıca sorulur.
      void onOm; void omTimer;
      ch.subscribe();
      return () => { clearTimeout(timer); clearTimeout(omTimer); sb.removeChannel(ch); };
    },
    async durum() {
      const { data } = await sb.from('bh_durum').select('son_esitleme,son_degisim,rapor_yukleme,masraf_son,son_hata').eq('id', 1).maybeSingle();
      if (!data) return null;
      return { son_esitleme: data.son_esitleme, imza: [data.son_degisim, data.rapor_yukleme, data.masraf_son, data.son_hata].join('|') };
    },
  };
}

// ======================= DEMO (tarayıcı) =======================
const LS = 'perakende-analiz-demo-v5';
const DEMO_CARI = ['PERAKENDE CARİ', 'PERAKENDE CARİ', 'PERAKENDE CARİ', 'Demir Lojistik', 'Ahmet Usta Oto', 'ALİ YILMAZ / 34 ABC 123 / FIAT EGEA', 'Çakıroğlu Otomotiv', 'KEMAL BEY / 34 KL 55 / RENAULT MEGANE', 'SELİN KAYA / 34 SK 812 / TOYOTA COROLLA', 'MURAT ÖZ / 41 MO 77 / VOLKSWAGEN CADDY', 'HASAN EKER / 34 HE 309 / HYUNDAI I20'];
const uid = () => crypto.randomUUID();

/** ham tablolardan uygulamanın veri yapısı */
function hamdanDB(h: Record<string, unknown[]>): DB {
  const u = h.urunler as Urun[], rs = h.rapor_satirlari as RaporSatiri[], ms = h.masraflar as Masraf[], hr = h.hareketler as Hareket[];
  const durum = ((h.bh_durum ?? [])[0] as BhDurum | null) ?? null;
  return {
    urunler: u, depolar: h.depolar, urun_depo_stok: h.urun_depo_stok, bh_durum: durum, hareketler: hareketleriBirlestir(hr, rs, durum, u, ms), stok_degisim: hr.map((x) => ({ ...x, kaynak: 'stok' as const })),
    iadeler: rs.filter((x) => x.iade && x.urun_id && x.miktar > 0).map((x) => ({ id: -x.id, tarih: `${x.tarih}T12:00:00`, urun_id: x.urun_id!, tur: x.tur, miktar: x.miktar, urun_ad: x.urun_ad, satis_fiyati: x.tur === 'satis' ? (x.toplam || 0) / x.miktar : 0, alis_fiyati: x.tur === 'alis' ? (x.net || 0) / x.miktar : x.alis_fiyati || 0, kdv: 20, yok_say: false, kaynak: 'fatura' as const, cari_ad: (x as unknown as { cari_ad?: string }).cari_ad ?? null })), masraflar: ms,
    kasa_akisi: h.kasa_akisi as KasaAkisi[], hesap_bakiyeleri: h.hesap_bakiyeleri as HesapBakiye[], vadesi_gecen: h.vadesi_gecen as VadesiGecen[], fiyat_gecmisi: h.fiyat_gecmisi, cariler: h.cariler, cari_hareketler: h.cari_hareketler,
    ayarlar: ((h.ayarlar ?? [])[0] as Ayarlar) ?? { id: 1, firma_adi: 'İşletmem' }, kullanicilar: h.kullanicilar, urun_kodlari: h.urun_kodlari, tahsilat_notlari: h.tahsilat_notlari, stok_aksiyon: h.stok_aksiyon, otomarmara_veri: h.otomarmara_veri as OtomarmaraVeri[],
  } as DB;
}

/** Rastgele ama tekrarlanabilir örnek veri: 40 ürün, son 45 günün satış/alış hareketleri, cariler */
function demoSeed(): DB {
  let tohum = 7; const rnd = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
  const d1 = uid(), d2 = uid();
  const katalog: [string, string, string, number, number][] = [
    ['Yağ Filtresi', 'Bosch', 'Filtre', 120, 1.75], ['Hava Filtresi', 'Mann', 'Filtre', 160, 1.7], ['Polen Filtresi', 'Mann', 'Filtre', 140, 1.9],
    ['Yakıt Filtresi', 'Bosch', 'Filtre', 220, 1.6], ['Motor Yağı 5W-30 4L', 'Castrol', 'Yağ', 950, 1.35], ['Motor Yağı 10W-40 4L', 'Shell', 'Yağ', 780, 1.4],
    ['Şanzıman Yağı 75W80 1L', 'Motul', 'Yağ', 420, 1.5], ['Ön Fren Balatası Egea', 'Brembo', 'Fren', 640, 1.7], ['Arka Fren Balatası', 'Brembo', 'Fren', 520, 1.7],
    ['Fren Diski Ön Megane IV', 'TRW', 'Fren', 1100, 1.45], ['Fren Hidroliği DOT4', 'Bosch', 'Fren', 150, 1.8], ['Buji (4lü)', 'NGK', 'Ateşleme', 380, 1.6],
    ['Ateşleme Bobini', 'Bosch', 'Ateşleme', 900, 1.5], ['Triger Seti', 'Gates', 'Motor', 2400, 1.4], ['V Kayışı', 'Gates', 'Motor', 260, 1.8],
    ['Devirdaim Pompası', 'SKF', 'Motor', 1300, 1.45], ['Termostat', 'Wahler', 'Soğutma', 450, 1.7], ['Antifriz 3L', 'Prestone', 'Soğutma', 300, 1.6],
    ['Radyatör Hortumu', 'Gates', 'Soğutma', 280, 1.9], ['Amortisör Ön Corolla', 'Sachs', 'Süspansiyon', 1800, 1.4], ['Amortisör Arka', 'Sachs', 'Süspansiyon', 1500, 1.4],
    ['Rotil', 'Lemförder', 'Süspansiyon', 420, 1.65], ['Rot Başı', 'Lemförder', 'Süspansiyon', 380, 1.65], ['Salıncak W205 C180', 'Febi', 'Süspansiyon', 1200, 1.5],
    ['Debriyaj Seti Caddy 1.6 TDI', 'Valeo', 'Şanzıman', 3800, 1.3], ['Silecek 60cm', 'Bosch', 'Aksesuar', 180, 2.0], ['Silecek 45cm', 'Bosch', 'Aksesuar', 150, 2.0],
    ['Akü 60Ah', 'Varta', 'Elektrik', 2600, 1.3], ['Akü 72Ah', 'Varta', 'Elektrik', 3100, 1.3], ['Far Ampulü H7', 'Philips', 'Elektrik', 120, 2.1],
    ['Stop Ampulü', 'Osram', 'Elektrik', 25, 2.4], ['Marş Motoru', 'Valeo', 'Elektrik', 4200, 1.25], ['Alternatör', 'Bosch', 'Elektrik', 5200, 1.25],
    ['Egzoz Contası', 'Elring', 'Egzoz', 90, 2.2], ['Oksijen Sensörü', 'Bosch', 'Egzoz', 1400, 1.45], ['ABS Sensörü', 'ATE', 'Fren', 650, 1.6],
    ['Kampana Seti', 'TRW', 'Fren', 900, 0.95], ['Motor Takozu Clio IV', 'Febi', 'Motor', 700, 1.5], ['Klima Gazı', 'Honeywell', 'Klima', 600, 1.7], ['Cam Suyu 3L', 'Prestone', 'Aksesuar', 60, 2.5],
  ];
  const uds: DB['urun_depo_stok'] = [];
  const urunler: Urun[] = katalog.map(([ad, marka, kategori, alis, oran], i) => {
    const id = uid(); const s1 = Math.floor(rnd() * 14), s2 = Math.floor(rnd() * 6);
    uds.push({ urun_id: id, depo_id: d1, miktar: s1 }, { urun_id: id, depo_id: d2, miktar: s2 });
    return { id, kod: 'P' + (1000 + i * 7), barkod: '869' + String(100000000 + i * 1371).padStart(10, '0'), ad, marka, kategori, birim: 'Adet',
      alis_fiyati: alis, satis_fiyati: Math.round((alis * oran) / 5) * 5, kdv: 20, stok: s1 + s2, bh_stok: s1 + s2,
      kritik_stok: i % 5 === 0 ? 3 : 0, raf: 'A-' + (1 + (i % 9)), aktif: true, bh_id: 'DEMO' + i };
  });
  const hareketler: Hareket[] = []; let hid = 1;
  const simdi = Date.now();
  for (let g = 44; g >= 0; g--) {
    const gunSatis = 4 + Math.floor(rnd() * 9);
    for (let k = 0; k < gunSatis; k++) {
      const i = Math.floor(Math.pow(rnd(), 1.8) * urunler.length); const u = urunler[i];
      const t = new Date(simdi - g * 864e5); t.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
      const ci = Math.floor(rnd() * DEMO_CARI.length);
      const mk = 1 + Math.floor(rnd() * 2.2); const indOran = ci > 2 && rnd() < 0.3 ? [0.05, 0.1, 0.15][Math.floor(rnd() * 3)] : 0;
      const sf = u.satis_fiyati * (1 - indOran); const brut = (u.satis_fiyati / 1.2) * mk;
      hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: u.id, tur: 'satis', miktar: mk, satis_fiyati: sf, alis_fiyati: u.alis_fiyati, kdv: u.kdv, yok_say: false, kaynak: 'fatura',
        depo: rnd() < 0.72 ? 'SULTANBEYLİ DEPO' : 'VELİBABA DEPO', brut, indirim: brut * indOran,
        cari_guid: 'C' + ci, cari_ad: DEMO_CARI[ci], kullanici: rnd() < 0.7 ? 'FURKAN' : 'EMİRHAN', belge_guid: `B${g}-${k >> 1}`, saat: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` });
    }
    if (g % 6 === 0) for (let k = 0; k < 4; k++) {
      const u = urunler[Math.floor(rnd() * urunler.length)];
      const t = new Date(simdi - g * 864e5); t.setHours(11);
      hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: u.id, tur: 'alis', miktar: 4 + Math.floor(rnd() * 8), satis_fiyati: u.satis_fiyati, alis_fiyati: u.alis_fiyati * (0.95 + rnd() * 0.15), kdv: u.kdv, yok_say: false, kaynak: 'fatura',
        cari_guid: k % 2 ? 'T1' : 'T2', cari_ad: k % 2 ? 'Martaş Otomotiv' : 'Otomarmara', belge_guid: `A${g}-${k % 2}` });
    }
  }
  for (let g = 44; g >= 0; g -= 2) {
    const t = new Date(simdi - g * 864e5); t.setHours(15);
    hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: 'yok:FREN BALATA DEĞİŞİM İŞÇİLİK', urun_ad: 'FREN BALATA DEĞİŞİM İŞÇİLİK', tur: 'satis', miktar: 1, satis_fiyati: 1200, alis_fiyati: 0, kdv: 20, yok_say: false, kaynak: 'fatura' });
    if (g % 10 === 0) hareketler.push({ id: hid++, tarih: t.toISOString(), urun_id: 'yok:KAPORTA TAMİR HİZMET', urun_ad: 'KAPORTA TAMİR HİZMET', tur: 'alis', miktar: 1, satis_fiyati: 0, alis_fiyati: 3000, kdv: 20, yok_say: false, kaynak: 'fatura' });
  }
  // satılmayan (ölü) stok örnekleri
  const olu: [string, string, string, number, number, number, 'iade' | 'kampanya' | 'toplu'][] = [
    ['Turbo Hortumu Passat B6', 'Febi', 'Motor', 1450, 1.5, 3, 'iade'], ['Far Sol Megane III', 'Valeo', 'Elektrik', 2900, 1.4, 2, 'kampanya'],
    ['Şanzıman Takozu Doblo', 'Lemförder', 'Şanzıman', 650, 1.6, 6, 'toplu'], ['Enjektör 1.5 dCi', 'Bosch', 'Motor', 3800, 1.3, 2, 'toplu'], ['Stop Lambası Sağ Fiesta', 'Depo', 'Elektrik', 420, 1.7, 4, 'kampanya']];
  for (const [ad, marka, kategori, alis, oran, stok, tip] of olu) {
    const id = uid(); uds.push({ urun_id: id, depo_id: d1, miktar: stok });
    urunler.push({ id, kod: 'X' + (urunler.length + 100), ad, marka, kategori, birim: 'Adet', alis_fiyati: alis, satis_fiyati: Math.round((alis * oran) / 5) * 5, kdv: 20, stok, bh_stok: stok, kritik_stok: 0, aktif: true, bh_id: 'DEMOX' + urunler.length });
    if (tip === 'iade') hareketler.push({ id: hid++, tarih: new Date(simdi - 40 * 864e5).toISOString(), urun_id: id, tur: 'alis', miktar: stok, satis_fiyati: 0, alis_fiyati: alis, kdv: 20, yok_say: false, kaynak: 'fatura', cari_ad: 'Martaş Otomotiv', cari_guid: 'T1', belge_guid: 'AX' + id });
    if (tip === 'kampanya') hareketler.push({ id: hid++, tarih: new Date(simdi - 120 * 864e5).toISOString(), urun_id: id, tur: 'satis', miktar: 1, satis_fiyati: alis * oran, alis_fiyati: alis, kdv: 20, yok_say: false, kaynak: 'fatura', cari_ad: 'PERAKENDE CARİ', belge_guid: 'BX' + id });
  }
  hareketler.sort((a, b) => b.tarih.localeCompare(a.tarih));
  // stok değişimleri (son 6 gün): faturalı satışlar + birkaç faturasız düşüş/artış örneği
  const stok_degisim: Hareket[] = hareketler.filter((h) => h.kaynak === 'fatura' && !h.urun_id.startsWith('yok:') && simdi - new Date(h.tarih).getTime() < 6 * 864e5)
    .map((h) => ({ ...h, id: hid++, kaynak: 'stok' as const }));
  for (const [i, tur, mk] of [[3, 'satis', 2], [7, 'satis', 1], [11, 'alis', 3], [15, 'satis', 4]] as const) {
    const u = urunler[i]; stok_degisim.push({ id: hid++, tarih: new Date(simdi - 2 * 864e5).toISOString(), urun_id: u.id, tur, miktar: mk, satis_fiyati: u.satis_fiyati, alis_fiyati: u.alis_fiyati, kdv: 20, yok_say: false, kaynak: 'stok' });
  }
  urunler[20].stok = -2;
  const kasa: DB['kasa_akisi'] = []; let kid = 1;
  for (let g = 44; g >= 0; g--) {
    const gun = new Date(simdi - g * 864e5).toLocaleDateString('sv');
    const ciro = hareketler.filter((h) => h.tur === 'satis' && h.tarih.slice(0, 10) === new Date(simdi - g * 864e5).toISOString().slice(0, 10)).reduce((t, h) => t + h.miktar * h.satis_fiyati, 0);
    kasa.push({ id: kid++, tarih: gun, tip: 'Tahsilat', hesap: rnd() < 0.5 ? 'Kasa' : 'POS', giris: Math.round(ciro * 0.85), cikis: 0 });
    if (g % 3 === 0) kasa.push({ id: kid++, tarih: gun, tip: 'Ödeme', hesap: 'Banka', karsi: 'Martaş Otomotiv', giris: 0, cikis: Math.round(8000 + rnd() * 12000) });
  }
  const cari = (ad: string, tur: Cari['tur'], bakiye: number, tel = ''): Cari => ({ id: uid(), bh_id: uid(), tur, ad, telefon: tel, bakiye, cek_senet: 0 });
  return {
    urunler, depolar: [{ id: d1, ad: 'SULTANBEYLİ DEPO', aktif: true, bh_id: 'D1' }, { id: d2, ad: 'VELİBABA DEPO', aktif: true, bh_id: 'D2' }], urun_depo_stok: uds,
    bh_durum: { id: 1, son_esitleme: new Date().toISOString(), takip_baslangic: new Date(simdi - 7 * 864e5).toISOString(), rapor_son: new Date().toLocaleDateString('sv'), rapor_ilk: new Date(simdi - 45 * 864e5).toLocaleDateString('sv'), urun_sayisi: urunler.length, depo_sayisi: 2, cari_sayisi: 6 },
    hareketler, stok_degisim, fiyat_gecmisi: [],
    cariler: [cari('Demir Lojistik', 'musteri', 12450, '05321112233'), cari('Ahmet Usta Oto', 'musteri', 3800), cari('34 ABC 123 / Egea', 'musteri', 950), cari('Perakende Cari', 'musteri', 0),
      cari('Martaş Otomotiv', 'tedarikci', -28400), cari('Otomarmara', 'tedarikci', -9150)],
    cari_hareketler: [], ayarlar: { id: 1, firma_adi: 'Demo İşletme', alis_kdv_haric: true, hedef_gun: 30, haric_masraf: [], hedef_marj: 35 }, kullanicilar: [], urun_kodlari: [],
    kasa_akisi: kasa, vadesi_gecen: [{ id: 1, cari: 'Demir Lojistik', telefon: '05321112233', tutar: 12450, gun: 38 }, { id: 2, cari: 'Ahmet Usta Oto', tutar: 3800, gun: 12 },
      { id: 3, cari: 'KEMAL BEY / 34 KL 55 / RENAULT MEGANE', telefon: '05551234567', tutar: 21500, gun: 74 }, { id: 4, cari: 'MURAT ÖZ / 41 MO 77 / VOLKSWAGEN CADDY', telefon: '05324445566', tutar: 8900, gun: 21 },
      { id: 5, cari: 'Çakıroğlu Otomotiv', telefon: '02164440000', tutar: 34200, gun: 55 }, { id: 6, cari: 'SELİN KAYA / 34 SK 812 / TOYOTA COROLLA', tutar: 2500, gun: 6 }],
    tahsilat_notlari: [], stok_aksiyon: [],
    hesap_bakiyeleri: [{ ad: 'Kasa', bakiye: 18500 }, { ad: 'Banka', bakiye: 92400 }, { ad: 'POS', bakiye: 6200 }, { ad: 'Kredi Kartı', bakiye: -48000 }],
    masraflar: [['Kira', 'İşletme Giderleri', 40000, 1], ['Maaş', 'Personel Giderleri', 55000, 2], ['Elektrik', 'İşletme Giderleri', 4200, 8], ['Yemek', 'Personel Giderleri', 9000, 12], ['Kira', 'İşletme Giderleri', 40000, 31], ['Maaş', 'Personel Giderleri', 55000, 32]]
      .map(([alt, ana, tutar, g], i) => ({ id: i + 1, tarih: new Date(simdi - (g as number) * 864e5).toLocaleDateString('sv'), ana: ana as string, alt: alt as string, aciklama: alt as string, tutar: tutar as number })),
  };
}

let demoSayim: SayimSatir[] = [];
let demoSorulan: Sorulan[] = [];
let demoTeklif: FiyatTeklifi[] = [];
function demoBackend(): Backend {
  let db: DB;
  try { db = JSON.parse(localStorage.getItem(LS) || 'null') || demoSeed(); } catch { db = demoSeed(); }
  db.masraflar ??= []; db.kasa_akisi ??= []; db.hesap_bakiyeleri ??= []; db.vadesi_gecen ??= []; db.tahsilat_notlari ??= []; db.stok_aksiyon ??= [];
  const listeners = new Set<() => void>();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(db)); } catch { /* yer yok */ } listeners.forEach((f) => f()); };
  const tbl = (t: CrudTable) => db[t] as unknown as { id: ID | number }[];
  return {
    async load() { return structuredClone(db); },
    async onbellektenDB() { return null; },
    async insert(t, row) {
      const r = { id: uid(), olusturma: new Date().toISOString(), ...row } as Record<string, unknown>;
      if (t === 'urun_kodlari') r.kod_norm = String(r.kod ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      tbl(t).unshift(r as { id: ID }); save();
    },
    async update(t, id, patch) { const r = tbl(t).find((x) => x.id === id); if (r) Object.assign(r, patch); save(); },
    async remove(t, id) { (db[t] as unknown) = tbl(t).filter((x) => x.id !== id); save(); },
    async ayarKaydet(a) { db.ayarlar = { ...db.ayarlar, ...a, id: 1 }; save(); },
    async bhEsitle() { return { ok: false, hata: 'Demo modunda BizimHesap bağlantısı yok' }; },
    async urunKodlariYukle(satirlar) {
      let eklenen = 0, bulunamayan = 0;
      for (const r of satirlar) {
        const u = db.urunler.find((x) => x.barkod === r.anahtar.trim()) ?? db.urunler.find((x) => x.kod === r.anahtar.trim());
        if (!u) { bulunamayan++; continue; }
        for (const k of r.kodlar.map((x) => x.trim()).filter(Boolean)) {
          const n = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (db.urun_kodlari.some((x) => x.urun_id === u.id && x.kod_norm === n)) continue;
          db.urun_kodlari.push({ id: uid(), urun_id: u.id, kod: k, kod_norm: n, tur: r.tur || 'OEM' }); eklenen++;
        }
      }
      save(); return { eklenen, bulunamayan };
    },
    subscribe(onChange) { listeners.add(onChange); return () => { listeners.delete(onChange); }; },
    async omIste() { /* demo: yok */ },
    async sorulanEkle(r) { demoSorulan.push({ ...r, id: demoSorulan.length + 1, zaman: new Date().toISOString() }); },
    async sorulanOku() { return [...demoSorulan]; },
    async teklifKaydet(r) { const id = demoTeklif.length + 1; demoTeklif.unshift({ ...r, id, zaman: new Date().toISOString(), durum: 'acik', durum_zaman: null }); return id; },
    async teklifOku() { return [...demoTeklif]; },
    async tyOku() { return { urunler: [], siparisler: [], durum: { son_urun: null, son_siparis: null, son_hata: 'Demo modunda Trendyol yok', urun_sayisi: 0, siparis_sayisi: 0 } }; },
    async tyCalistir() { throw new Error('Demo modunda Trendyol yok'); },
    async tyGonderimOku() { return []; },
    async tyFiyatSupheli() { return []; },
    async tedarikciMaliyet() { return []; },
    async eklentiAnahtar() { return null; },
    async tyIslem() { throw new Error('Demo modunda Trendyol yok'); },
    async tyEslemeOku() { return { kategori: [], marka: [], yukleme: [] }; },
    async tyOtoOzet() { return { aday: 0, duzenli: 0, bugun: 0, eslesmemis: [], atlanan: [] }; },
    async rakipPazar() { return { urunler: [], sayfa: 0, taranan: 0, son: null }; },
    async rakipNotKaydet() { /* demo */ },
    async sorulanRafa() { return []; },
    async urunGorselleri() { return new Map(); },
    async teklifGuncelle(id, p) { demoTeklif = demoTeklif.map((x) => (x.id === id ? { ...x, ...p } : x)); },
    async sorulanSil(id) { demoSorulan = demoSorulan.filter((x) => x.id !== id); },
    async sayimOku(depoId) { return demoSayim.filter((x) => x.depo_id === depoId); },
    async sayimKaydet(r) { demoSayim = [...demoSayim.filter((x) => !(x.depo_id === r.depo_id && x.urun_id === r.urun_id)), { ...r, zaman: new Date().toISOString() }]; },
    async sayimSil(depoId, urunId) { demoSayim = demoSayim.filter((x) => !(x.depo_id === depoId && (!urunId || x.urun_id === urunId))); },
    async omAra() { throw new Error('Demo modunda Otomarmara araması yok'); },
    async nekoAra() { throw new Error('Demo modunda Neko araması yok'); },
    async nekoEsdeger() { throw new Error('Demo modunda Neko araması yok'); },
    async nekoToplu() { throw new Error('Demo modunda Neko araması yok'); },
    async omDetay() { throw new Error('Demo modunda Otomarmara araması yok'); },
    async omVeri() { return []; },
    async omDegisen() { return { veri: [], kodlar: [] }; },
    async durum() { return null; },
  };
}

export const backend: Backend = supabase ? supabaseBackend(supabase) : demoBackend();
/** yalnız testler için */
export const __testBackend = supabaseBackend;
export const demoSifirla = () => { localStorage.removeItem(LS); location.reload(); };
