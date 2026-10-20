import type { Ayarlar, DB, Hareket, ID, Urun } from './types';
import { gunu } from './format';

export interface Donem { bas: string; bit: string } // YYYY-MM-DD, iki uç dahil

const kdvCarpan = (kdv: number) => 1 + (Number(kdv) || 0) / 100;
/** Birim satış fiyatı, KDV hariç (BizimHesap satış fiyatları KDV dahil) */
export const netSatis = (fiyat: number, kdv: number) => fiyat / kdvCarpan(kdv);
/** Birim alış fiyatı, KDV hariç (ayara göre) */
export const netAlis = (fiyat: number, kdv: number, a: Ayarlar) => (a.alis_kdv_haric ? fiyat : fiyat / kdvCarpan(kdv));

/** Ürünün birim kârı ve marjı (güncel liste fiyatlarıyla) */
export function birimKar(u: Pick<Urun, 'satis_fiyati' | 'alis_fiyati' | 'kdv'>, a: Ayarlar) {
  const s = netSatis(u.satis_fiyati, u.kdv), m = netAlis(u.alis_fiyati, u.kdv, a);
  return { satisNet: s, alisNet: m, kar: s - m, marj: s > 0 ? ((s - m) / s) * 100 : 0, maliyetYok: !(u.alis_fiyati > 0) };
}

export const donemde = (t: string, d: Donem) => { const g = gunu(t); return g >= d.bas && g <= d.bit; };
export const gecerliHareketler = (db: DB, d: Donem) => db.hareketler.filter((h) => !h.yok_say && donemde(h.tarih, d));

/** Hareketin tutarları: ciro KDV dahil (müşterinin ödediği), kâr KDV hariç */
export function hareketTutar(h: Hareket, a: Ayarlar) {
  const ciro = h.miktar * h.satis_fiyati;
  const ciroNet = h.miktar * netSatis(h.satis_fiyati, h.kdv);
  const maliyet = h.miktar * netAlis(h.alis_fiyati, h.kdv, a);
  return { ciro, ciroNet, maliyet, kar: h.alis_fiyati > 0 ? ciroNet - maliyet : 0, maliyetYok: !(h.alis_fiyati > 0) };
}

export interface UrunOzet {
  urun: Urun; satilan: number; ciro: number; ciroNet: number; maliyet: number; kar: number;
  alinan: number; alisTutar: number; satisSayisi: number; sonSatis?: string;
}

export function urunOzetleri(db: DB, d: Donem): Map<ID, UrunOzet> {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const m = new Map<ID, UrunOzet>();
  for (const h of gecerliHareketler(db, d)) {
    const u = urun.get(h.urun_id); if (!u) continue;
    let x = m.get(u.id);
    if (!x) { x = { urun: u, satilan: 0, ciro: 0, ciroNet: 0, maliyet: 0, kar: 0, alinan: 0, alisTutar: 0, satisSayisi: 0 }; m.set(u.id, x); }
    if (h.tur === 'satis') {
      const t = hareketTutar(h, db.ayarlar);
      x.satilan += h.miktar; x.ciro += t.ciro; x.ciroNet += t.ciroNet; x.maliyet += t.maliyet; x.kar += t.kar; x.satisSayisi++;
      if (!x.sonSatis || h.tarih > x.sonSatis) x.sonSatis = h.tarih;
    } else { x.alinan += h.miktar; x.alisTutar += h.miktar * h.alis_fiyati; }
  }
  return m;
}

export interface Toplam { ciro: number; ciroNet: number; maliyet: number; kar: number; satilanAdet: number; satisSayisi: number; alisTutar: number; alinanAdet: number; maliyetsiz: number }
export function toplamlar(db: DB, d: Donem): Toplam {
  const t: Toplam = { ciro: 0, ciroNet: 0, maliyet: 0, kar: 0, satilanAdet: 0, satisSayisi: 0, alisTutar: 0, alinanAdet: 0, maliyetsiz: 0 };
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur === 'satis') {
      const x = hareketTutar(h, db.ayarlar);
      t.ciro += x.ciro; t.ciroNet += x.ciroNet; t.maliyet += x.maliyet; t.kar += x.kar; t.satilanAdet += h.miktar; t.satisSayisi++;
      if (x.maliyetYok) t.maliyetsiz++;
    } else { t.alisTutar += h.miktar * h.alis_fiyati; t.alinanAdet += h.miktar; }
  }
  return t;
}

/** Günlük seri (grafikler için); boş günler 0 */
export function gunlukSeri(db: DB, d: Donem, deger: (h: Hareket) => number, tur: Hareket['tur'] = 'satis') {
  const m = new Map<string, number>();
  for (let t = new Date(d.bas + 'T12:00'); gunu(t) <= d.bit; t = new Date(t.getTime() + 864e5)) m.set(gunu(t), 0);
  for (const h of gecerliHareketler(db, d)) if (h.tur === tur) { const g = gunu(h.tarih); m.set(g, (m.get(g) ?? 0) + deger(h)); }
  return [...m.entries()].map(([gun, v]) => ({ gun, deger: v }));
}

/** Dönemin takip edilen gün sayısı (takip başlangıcından önce veri yok) */
const ilkSatisOnbellek = new WeakMap<object, string>();
/** Verideki ilk satış günü (rapor başlangıcı daha erken görünse de satış verisi bu günden başlıyor) */
export function ilkSatisGunu(db: DB) {
  const v = ilkSatisOnbellek.get(db.hareketler); if (v !== undefined) return v || null;
  let m = ''; for (const h of db.hareketler) if (h.tur === 'satis' && (!m || h.tarih < m)) m = h.tarih;
  const g = m ? gunu(m) : ''; ilkSatisOnbellek.set(db.hareketler, g); return g || null;
}
export function takipGunu(db: DB, d: Donem) {
  const rapor = db.bh_durum?.rapor_ilk ?? (db.bh_durum?.takip_baslangic ? gunu(db.bh_durum.takip_baslangic) : null);
  const ilkS = ilkSatisGunu(db);
  const ilk = rapor && ilkS ? (rapor > ilkS ? rapor : ilkS) : rapor ?? ilkS;
  const bas = ilk ?? d.bas;
  const b = d.bas > bas ? d.bas : bas, s = d.bit < gunu() ? d.bit : gunu();
  return Math.max(1, Math.round((new Date(s + 'T12:00').getTime() - new Date(b + 'T12:00').getTime()) / 864e5) + 1);
}

/** Stokla takip edilen gerçek ürün mü (işçilik, hizmet, araç alım/satım ve kategorisiz kalemler değil) */
export const stokluMu = (u: Urun) => !!u.kategori && !GECIS_RE.test(u.ad) && !/işçilik|iscilik|hizmet|revizyon|prim\b|primi|montaj|tamir|torna|kaporta|ücret|rektefiye|değişim|degisim/.test(u.ad.toLocaleLowerCase('tr'));

export type AbcSinif = 'A' | 'B' | 'C';
/** ABC: değeri büyükten küçüğe sırala; toplamın ilk %80'i A, sonraki %15'i B, kalanı C */
export function abcSinifla<T>(liste: T[], deger: (x: T) => number, aSinir = 80, bSinir = 95): Map<T, AbcSinif> {
  const sirali = [...liste].filter((x) => deger(x) > 0).sort((a, b) => deger(b) - deger(a));
  const toplam = sirali.reduce((t, x) => t + deger(x), 0) || 1;
  const m = new Map<T, AbcSinif>(); let kum = 0;
  for (const x of sirali) { const once = (kum / toplam) * 100; kum += deger(x); m.set(x, once < aSinir ? 'A' : once < bSinir ? 'B' : 'C'); }
  for (const x of liste) if (!m.has(x)) m.set(x, 'C');
  return m;
}

/** Kritik stok = rafta en az bu kadar olsun: stok bu seviyenin ALTINA inince uyarı (kullanıcı kararı) */
export const kritikAltinda = (u: Pick<Urun, 'kritik_stok' | 'stok'>) => u.kritik_stok > 0 && u.stok < u.kritik_stok;

/** Alınacak adet: günlük satış hızı × hedef gün − mevcut stok; kritik stok tanımlıysa en az ona tamamla */
export function alinacakHesap(u: Urun, satilan: number, gunSayisi: number, hedefGun: number) {
  const hiz = satilan / Math.max(1, gunSayisi);
  const stok = Math.max(0, u.stok);
  // hedef sürede yarım adetten az satış bekleniyorsa (ör. yılda bir satılan motor) stok önerilmez
  const beklenen = hiz * hedefGun;
  const hedef = Math.max(beklenen >= 0.5 ? Math.ceil(beklenen) : 0, u.kritik_stok > 0 ? Math.ceil(u.kritik_stok) : 0);
  const yeterGun = hiz > 0 ? stok / hiz : Infinity;
  return { hiz, hedef, alinacak: Math.max(0, hedef - stok), yeterGun };
}

// ======================= GELİR TABLOSU =======================
const HIZMET_RE = /İŞÇİLİK|ISCILIK|IŞÇİLİK|HİZMET|HIZMET|TAMİR|TAMIR|REVİZYON|REVIZYON|DEĞİŞİM|DEGISIM|YAZILIM|MONTAJ|BAKIM|TESİSAT|TESISAT|ARIZA|KAPORTA|BOYA|SÖKÜM|SOKUM|SÖKME|SOKME|ONARIM|KODLAMA|AYAR|TEST|PRİM|PRIM|ÜCRET|UCRET|YIKAMA|TORNA|REKTEF|EKSPER|NAKLİYE|NAKLIYE|ÇEKİCİ|CEKICI|DOLUM|CAM FİLM|PARLATMA|KONTROL|LASTİK TAK|LASTIK TAK|KLİMA GAZ/;

export const GECIS_RE = /ARAÇ ALIM|ARAC ALIM|ARAÇ SATI|ARAC SATI|ARAÇ BEDEL|ARAC BEDEL/i;

/** Adı hizmet/işçilik kalemi mi (BizimHesap'ta adlar büyük harf; yine de Türkçe büyük harfe çevrilip bakılır) */
export const hizmetAdiMi = (ad: string) => HIZMET_RE.test(ad.toLocaleUpperCase('tr'));

/** Maliyeti olmayan satış satırı hizmet mi, yoksa alış fiyatı/kategorisi girilmemiş parça mı?
 *  Kullanıcı kararı: yalnız iki grup (parça / hizmet). Adı hizmet olanlar hizmet; kategorisiz ama adı parça olanlar
 *  (kutup başı, kelepçe, braket…) parça sayılır ve "maliyeti/kategorisi eksik" listesine düşer. */
export function hizmetMi(h: Hareket, u?: Urun) {
  const ad = u?.ad ?? h.urun_ad ?? '';
  return hizmetAdiMi(ad);
}

/** Kartında eksik bilgi var mı: kategorili üründe alış fiyatı yok veya adı parça olduğu hâlde kategorisi boş */
export function kartEksigi(u: Urun): { maliyet: boolean; kategori: boolean } | null {
  if (!u.aktif || GECIS_RE.test(u.ad) || hizmetAdiMi(u.ad)) return null;
  const maliyet = !(u.alis_fiyati > 0), kategori = !u.kategori;
  return maliyet || kategori ? { maliyet, kategori } : null;
}

export interface GelirTablosu {
  urunSatis: number; urunMaliyet: number; urunKar: number; maliyetsizUrun: number; maliyetsizUrunListe: { ad: string; tutar: number; adet: number; id?: string }[];
  /** araç alım/satım gibi işletme dışı geçiş satışları: ciroda görünür, hizmet ve kâra katılmaz */
  gecis: number; gecisListe: { ad: string; tutar: number; adet: number }[];
  hizmetGeliri: number; hizmetListe: { ad: string; tutar: number; adet: number }[]; disHizmet: number; disHizmetListe: { ad: string; tutar: number }[]; ciftKayit: number;
  masraf: number; masrafGruplari: { anahtar: string; ana: string; alt: string; tutar: number; adet: number; haric: boolean }[]; haricMasraf: number;
  hizmetKar: number; brutKar: number; netKar: number;
}

/** Ürün kârı + hizmet kârı − işletme giderleri (tutarlar KDV hariç; masraflar BizimHesap'taki toplamla) */
export function gelirTablosu(db: DB, d: Donem): GelirTablosu {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const t: GelirTablosu = { urunSatis: 0, urunMaliyet: 0, urunKar: 0, maliyetsizUrun: 0, maliyetsizUrunListe: [], gecis: 0, gecisListe: [], hizmetGeliri: 0, hizmetListe: [], disHizmet: 0, disHizmetListe: [], ciftKayit: 0, masraf: 0, masrafGruplari: [], haricMasraf: 0, hizmetKar: 0, brutKar: 0, netKar: 0 };
  const topla = (m: Map<string, { ad: string; tutar: number; adet: number }>, ad: string, tutar: number, adet: number) => { const x = m.get(ad) ?? { ad, tutar: 0, adet: 0 }; x.tutar += tutar; x.adet += adet; m.set(ad, x); };
  const hz = new Map<string, { ad: string; tutar: number; adet: number }>(), mu = new Map<string, { ad: string; tutar: number; adet: number }>(), dh = new Map<string, { ad: string; tutar: number; adet: number }>(), gc = new Map<string, { ad: string; tutar: number; adet: number }>();
  for (const h of gecerliHareketler(db, d)) {
    const u = urun.get(h.urun_id);
    if (h.tur === 'satis') {
      const x = hareketTutar(h, db.ayarlar);
      if (!x.maliyetYok) { t.urunSatis += x.ciroNet; t.urunMaliyet += x.maliyet; }
      else if (GECIS_RE.test(u?.ad ?? h.urun_ad ?? '')) { t.gecis += x.ciroNet; topla(gc, u?.ad ?? h.urun_ad ?? '—', x.ciroNet, h.miktar); }
      else if (hizmetMi(h, u)) { t.hizmetGeliri += x.ciroNet; topla(hz, u?.ad ?? h.urun_ad ?? '—', x.ciroNet, h.miktar); }
      else { t.maliyetsizUrun += x.ciroNet; topla(mu, u?.ad ?? h.urun_ad ?? '—', x.ciroNet, h.miktar); if (u) (mu.get(u.ad) as { id?: string }).id = String(u.id); }
    } else if (!u && h.kaynak === 'fatura') {
      // stok dışı alış: dışarıdan alınan hizmet / parça (masraf olarak da girilmişse çift sayılmaz)
      const tutar = h.miktar * h.alis_fiyati;
      if (h.cift_kayit) t.ciftKayit += tutar;
      else { t.disHizmet += tutar; topla(dh, h.urun_ad ?? '—', tutar, h.miktar); }
    }
  }
  t.urunKar = t.urunSatis - t.urunMaliyet;
  const haric = new Set(db.ayarlar.haric_masraf ?? []);
  const mg = new Map<string, GelirTablosu['masrafGruplari'][number]>();
  for (const m of db.masraflar) {
    if (m.tarih < d.bas || m.tarih > d.bit) continue;
    const anahtar = `${m.ana ?? ''}/${m.alt ?? ''}`;
    const g = mg.get(anahtar) ?? { anahtar, ana: m.ana || 'Diğer', alt: m.alt || '—', tutar: 0, adet: 0, haric: haric.has(anahtar) };
    g.tutar += m.tutar; g.adet++; mg.set(anahtar, g);
  }
  t.masrafGruplari = [...mg.values()].sort((a, b) => b.tutar - a.tutar);
  t.masraf = t.masrafGruplari.filter((g) => !g.haric).reduce((s, g) => s + g.tutar, 0);
  t.haricMasraf = t.masrafGruplari.filter((g) => g.haric).reduce((s, g) => s + g.tutar, 0);
  t.hizmetListe = [...hz.values()].sort((a, b) => b.tutar - a.tutar);
  t.maliyetsizUrunListe = [...mu.values()].sort((a, b) => b.tutar - a.tutar);
  t.gecisListe = [...gc.values()].sort((a, b) => b.tutar - a.tutar);
  t.disHizmetListe = [...dh.values()].sort((a, b) => b.tutar - a.tutar);
  t.hizmetKar = t.hizmetGeliri - t.disHizmet;
  t.brutKar = t.urunKar + t.hizmetKar;
  t.netKar = t.brutKar - t.masraf;
  return t;
}
