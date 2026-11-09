/**
 * Belge motoru (Faz 1, YALNIZ TEST ORTAMI): stok fişleri, AKCAN stok defteri, ürün türü, açılış.
 * Tüm yazma işlemleri sunucu fonksiyonlarıyla yapılır (belge_kaydet / belge_onayla / belge_iptal …);
 * kurallar (eksi stok, çift onay, değiştirilemezlik, hizmet ürünü) veritabanında uygulanır, burada yalnız gösterilir.
 */
import { supabase } from './backend';

/** Belge motoru ekranları yalnız test sitesinde (VITE_ORTAM=test) görünür; canlı derlemeye girmez */
export const BELGE_MOTORU = import.meta.env.VITE_ORTAM === 'test';

export type BelgeTur = 'GIR' | 'CIK' | 'TRF' | 'SAY' | 'ACL';
export type BelgeDurum = 'taslak' | 'onayli' | 'iptal';
export const TUR_AD: Record<BelgeTur, string> = { GIR: 'Stok giriş fişi', CIK: 'Stok çıkış fişi', TRF: 'Depolar arası transfer', SAY: 'Sayım fişi', ACL: 'Açılış fişi' };
export const TUR_KISA: Record<BelgeTur, string> = { GIR: 'Giriş', CIK: 'Çıkış', TRF: 'Transfer', SAY: 'Sayım', ACL: 'Açılış' };
export const DURUM_AD: Record<BelgeDurum, string> = { taslak: 'Onay bekliyor', onayli: 'Onaylı', iptal: 'İptal' };
/** personelin taslak açabildiği türler (veritabanındaki belge_turleri ile aynı) */
export const PERSONEL_TURLER: BelgeTur[] = ['CIK', 'TRF', 'SAY'];

export interface BelgeOzet {
  id: string; tur: BelgeTur; no: string | null; durum: BelgeDurum; tarih: string; depo_id: string; hedef_depo_id: string | null; aciklama: string | null;
  surum: number; olusturan: string; olusturma: string; guncelleyen: string | null; guncelleme: string | null;
  onaylayan: string | null; onay_zaman: string | null; iptal_eden: string | null; iptal_zaman: string | null; iptal_nedeni: string | null;
  satir: number; toplam_miktar: number;
}
export interface BelgeSatir { id: number; belge_id: string; sira: number; urun_id: string; miktar: number | null; birim_maliyet: number | null; sayilan: number | null; sistem: number | null; fark: number | null; notlar: string | null }
export interface DefterSatir {
  id: number; zaman: string; tarih: string; belge_id: string; belge_no: string; tur: BelgeTur; islem: 'onay' | 'iptal'; satir_id: number | null; urun_id: string; depo_id: string;
  miktar: number; onceki_miktar: number; sonraki_miktar: number; toplam_onceki: number; toplam_sonraki: number; ters_kayit_id: number | null; kullanici: string;
  /** yalnız yönetici */ birim_maliyet?: number; tutar?: number; ort_onceki?: number | null; ort_sonraki?: number;
}
export interface Bakiye { urun_id: string; depo_id: string; miktar: number }
export interface UrunTuruSatir { urun_id: string; ad: string; kod: string | null; kategori: string | null; bh_stok: number; tur: 'stoklu' | 'hizmet' | null; belirleyen: string | null; zaman: string | null; aday: boolean; akcan_stok: number }
export interface Istisna { urun_id: string; ad: string; kod: string | null; bh_miktar: number; alis_net: number; satis_net: number; neden: string }
export interface KaydetGirdi {
  id?: string; surum?: number; istek_anahtari: string; tur: BelgeTur; tarih?: string; depo_id: string; hedef_depo_id?: string | null; aciklama?: string;
  satirlar: { urun_id: string; miktar?: number | null; birim_maliyet?: number | null; sayilan?: number | null; notlar?: string | null }[];
}

const sb = () => { if (!supabase) throw new Error('Bulut bağlantısı yok'); return supabase; };
/** veritabanı hata metnini kullanıcıya olduğu gibi gösterir (mesajlar Türkçe yazıldı) */
const hata = (e: { message?: string } | null) => { if (e) throw new Error((e.message ?? 'Hata').replace(/^.*?ERROR:\s*/, '')); };
const sayiyla = <T extends object>(r: T, alanlar: string[]): T => { const o: Record<string, unknown> = { ...(r as Record<string, unknown>) }; for (const a of alanlar) if (o[a] !== null && o[a] !== undefined) o[a] = Number(o[a]); return o as T; };

/** veritabanı tek seferde en çok 1000 satır verir: sayfalayarak hepsini okur */
async function hepsi<T>(sorgu: (a: number, b: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 100000; i += 1000) { const { data, error } = await sorgu(i, i + 999); hata(error); out.push(...((data ?? []) as T[])); if (!data || data.length < 1000) break; }
  return out;
}

export const belgeApi = {
  async liste(durum: BelgeDurum, limit = 200): Promise<BelgeOzet[]> {
    const { data, error } = await sb().from('belge_listesi').select('*').eq('durum', durum).order(durum === 'taslak' ? 'olusturma' : durum === 'onayli' ? 'onay_zaman' : 'iptal_zaman', { ascending: false }).limit(limit);
    hata(error); return (data ?? []).map((r) => sayiyla(r as BelgeOzet, ['satir', 'toplam_miktar', 'surum']));
  },
  async sayilar(): Promise<Record<BelgeDurum, number>> {
    const say = async (d: BelgeDurum) => { const { count, error } = await sb().from('belgeler').select('id', { count: 'exact', head: true }).eq('durum', d); hata(error); return count ?? 0; };
    const [t, o, i] = await Promise.all([say('taslak'), say('onayli'), say('iptal')]); return { taslak: t, onayli: o, iptal: i };
  },
  async detay(id: string, yonetici: boolean): Promise<{ belge: BelgeOzet; satirlar: BelgeSatir[]; defter: DefterSatir[]; iptalBelgesi?: never }> {
    const [b, s, d] = await Promise.all([
      sb().from('belge_listesi').select('*').eq('id', id).maybeSingle(),
      sb().from(yonetici ? 'belge_satirlari' : 'belge_satirlari_p').select('*').eq('belge_id', id).order('sira'),
      sb().from(yonetici ? 'stok_defteri' : 'stok_defteri_p').select('*').eq('belge_id', id).order('id'),
    ]);
    hata(b.error); hata(s.error); hata(d.error);
    if (!b.data) throw new Error('Belge bulunamadı');
    return {
      belge: sayiyla(b.data as BelgeOzet, ['satir', 'toplam_miktar', 'surum']),
      satirlar: (s.data ?? []).map((r) => sayiyla(r as BelgeSatir, ['miktar', 'birim_maliyet', 'sayilan', 'sistem', 'fark'])),
      defter: (d.data ?? []).map((r) => sayiyla(r as DefterSatir, ['miktar', 'onceki_miktar', 'sonraki_miktar', 'toplam_onceki', 'toplam_sonraki', 'birim_maliyet', 'tutar', 'ort_onceki', 'ort_sonraki'])),
    };
  },
  async kaydet(g: KaydetGirdi): Promise<{ id: string; surum: number; tekrar?: boolean }> {
    const { data, error } = await sb().rpc('belge_kaydet', { p: g }); hata(error); return data as { id: string; surum: number; tekrar?: boolean };
  },
  async onayla(id: string, surum: number): Promise<{ no: string; zaten?: boolean; hareket?: number }> {
    const { data, error } = await sb().rpc('belge_onayla', { p_id: id, p_surum: surum }); hata(error); return data as { no: string; zaten?: boolean };
  },
  async iptal(id: string, neden: string): Promise<{ no: string; zaten?: boolean }> {
    const { data, error } = await sb().rpc('belge_iptal', { p_id: id, p_neden: neden }); hata(error); return data as { no: string; zaten?: boolean };
  },
  async taslakSil(id: string) { const { error } = await sb().rpc('belge_taslak_sil', { p_id: id }); hata(error); },
  /** AKCAN depo bakiyeleri (tamamı; miktarlar maliyetsiz) */
  async bakiyeler(): Promise<Bakiye[]> {
    const l = await hepsi<Bakiye>((a, b) => sb().from('stok_bakiye').select('urun_id,depo_id,miktar').order('urun_id').order('depo_id').range(a, b));
    return l.map((x) => ({ ...x, miktar: Number(x.miktar) }));
  },
  async urunBakiye(urunId: string): Promise<Bakiye[]> {
    const { data, error } = await sb().from('stok_bakiye').select('urun_id,depo_id,miktar').eq('urun_id', urunId); hata(error);
    return (data ?? []).map((x) => ({ ...(x as Bakiye), miktar: Number(x.miktar) }));
  },
  async urunTuru(urunId: string): Promise<'stoklu' | 'hizmet' | null> {
    const { data, error } = await sb().from('urun_turu').select('tur').eq('urun_id', urunId).maybeSingle(); hata(error); return (data?.tur as 'stoklu' | 'hizmet') ?? null;
  },
  async urunHareketleri(urunId: string, yonetici: boolean, limit = 60): Promise<DefterSatir[]> {
    const { data, error } = await sb().from(yonetici ? 'stok_defteri' : 'stok_defteri_p').select('*').eq('urun_id', urunId).order('id', { ascending: false }).limit(limit);
    hata(error); return (data ?? []).map((r) => sayiyla(r as DefterSatir, ['miktar', 'onceki_miktar', 'sonraki_miktar', 'toplam_onceki', 'toplam_sonraki', 'birim_maliyet', 'tutar', 'ort_onceki', 'ort_sonraki']));
  },
  async urunMaliyet(urunId: string): Promise<{ ort_maliyet: number; toplam_miktar: number; toplam_deger: number } | null> {
    const { data, error } = await sb().from('urun_maliyet').select('ort_maliyet,toplam_miktar,toplam_deger').eq('urun_id', urunId).maybeSingle();
    hata(error); return data ? { ort_maliyet: Number(data.ort_maliyet), toplam_miktar: Number(data.toplam_miktar), toplam_deger: Number(data.toplam_deger) } : null;
  },
  /** ürün türleri: belirlenmiş olanlar (stoklu/hizmet) */
  async turler(): Promise<Map<string, 'stoklu' | 'hizmet'>> {
    const l = await hepsi<{ urun_id: string; tur: 'stoklu' | 'hizmet' }>((a, b) => sb().from('urun_turu').select('urun_id,tur').order('urun_id').range(a, b));
    return new Map(l.map((x) => [x.urun_id, x.tur]));
  },
  async turKontrol(): Promise<UrunTuruSatir[]> {
    const l = await hepsi<UrunTuruSatir>((a, b) => sb().from('urun_turu_kontrol').select('*').order('ad').range(a, b));
    return l.map((x) => sayiyla(x, ['bh_stok', 'akcan_stok']));
  },
  async turBelirle(ids: string[], tur: 'stoklu' | 'hizmet') { const { error } = await sb().rpc('urun_turu_belirle', { p_urunler: ids, p_tur: tur }); hata(error); },
  async acilisOlustur(depoId: string): Promise<{ belge: number; satir: number }> {
    const { data, error } = await sb().rpc('acilis_taslagi_olustur', { p_depo: depoId }); hata(error); return data as { belge: number; satir: number };
  },
  async acilisIstisnalari(depoId: string): Promise<Istisna[]> {
    const { data, error } = await sb().rpc('acilis_istisnalari', { p_depo: depoId }); hata(error);
    return (data ?? []).map((r: Istisna) => sayiyla(r, ['bh_miktar', 'alis_net', 'satis_net']));
  },
};

/** hizmet adayı mı (veritabanındaki hizmet_adayi_mi ile aynı kural; yalnız ekranda uyarı için) */
export const hizmetAdayi = (ad?: string | null, kategori?: string | null) =>
  /(İŞÇİLİK|ISCILIK|İSCİLİK|IŞÇILIK|HİZMET|HIZMET|DANIŞMANLIK|YIKAMA|MONTAJ ÜCRET|SERVİS ÜCRET|TAMİR ÜCRET)/.test(`${ad ?? ''} ${kategori ?? ''}`.toLocaleUpperCase('tr'));

/** ürünün stok belgelerine girip giremeyeceği (ekranda; asıl kontrol veritabanında) */
export function urunDurumu(turler: Map<string, 'stoklu' | 'hizmet'>, u: { id: string; ad: string; kategori?: string | null }): 'stoklu' | 'hizmet' | 'belirsiz' {
  const t = turler.get(u.id); if (t) return t;
  return hizmetAdayi(u.ad, u.kategori) ? 'belirsiz' : 'stoklu';
}

/** yeni istek anahtarı (aynı formun tekrar gönderimi aynı belgeyi döndürür) */
export const yeniAnahtar = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }));

/** AKCAN ↔ BizimHesap stok karşılaştırması (ürün × depo); hizmet ürünleri hariç */
export interface Karsilastirma { urun_id: string; depo_id: string; akcan: number; bh: number; fark: number }
export function karsilastir(bakiye: Bakiye[], bh: { urun_id: string; depo_id: string; miktar: number }[], hizmet: Set<string>, depolar: Set<string>): Karsilastirma[] {
  const m = new Map<string, Karsilastirma>();
  const k = (u: string, d: string) => `${u}|${d}`;
  for (const x of bh) { if (hizmet.has(x.urun_id) || !depolar.has(x.depo_id)) continue; m.set(k(x.urun_id, x.depo_id), { urun_id: x.urun_id, depo_id: x.depo_id, akcan: 0, bh: Number(x.miktar) || 0, fark: 0 }); }
  for (const x of bakiye) { if (!depolar.has(x.depo_id)) continue; const a = m.get(k(x.urun_id, x.depo_id)); if (a) a.akcan = x.miktar; else m.set(k(x.urun_id, x.depo_id), { urun_id: x.urun_id, depo_id: x.depo_id, akcan: x.miktar, bh: 0, fark: 0 }); }
  const l = [...m.values()]; for (const x of l) x.fark = Math.round((x.akcan - x.bh) * 1000) / 1000;
  return l;
}
