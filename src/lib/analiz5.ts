import type { DB, Hareket, ID, Urun } from './types';
import { gecerliHareketler, hareketTutar, hizmetAdiMi, stokluMu, type Donem } from './analiz';
import { gecisBelgeleri, PERAKENDE_RE } from './analiz2';
import { gunu } from './format';

const gun = (t: string) => new Date(gunu(t) + 'T12:00').getTime();

// ======================= BİRLİKTE SATILANLAR (ürün başına) =======================
export interface Yaninda { u: Urun; n: number; oran: number }
const yanindaOnbellek = new WeakMap<DB, Map<ID, Yaninda[]>>();
/** Son 180 günde aynı faturada en az 2 kez birlikte satılan ürünler (ürün başına en çok 5) */
export function birlikteSatilanlar(db: DB): Map<ID, Yaninda[]> {
  const v = yanindaOnbellek.get(db); if (v) return v;
  const sinir = gunu(new Date(Date.now() - 179 * 864e5));
  const urun = new Map(db.urunler.map((u) => [u.id, u])); const gecis = gecisBelgeleri(db);
  const belge = new Map<string, Set<ID>>();
  for (const h of db.hareketler) {
    if (h.tur !== 'satis' || h.yok_say || !h.belge_guid || gunu(h.tarih) < sinir || gecis.has(h.belge_guid)) continue;
    const u = urun.get(h.urun_id); if (!u || !stokluMu(u) || hizmetAdiMi(u.ad)) continue;
    const s = belge.get(h.belge_guid) ?? new Set(); s.add(u.id); belge.set(h.belge_guid, s);
  }
  const tek = new Map<ID, number>(); const cift = new Map<ID, Map<ID, number>>();
  for (const s of belge.values()) {
    const l = [...s].slice(0, 25);
    for (const a of l) { tek.set(a, (tek.get(a) ?? 0) + 1); if (l.length < 2) continue; const m = cift.get(a) ?? new Map(); for (const b of l) if (b !== a) m.set(b, (m.get(b) ?? 0) + 1); cift.set(a, m); }
  }
  const r = new Map<ID, Yaninda[]>();
  for (const [a, m] of cift) {
    const l = [...m.entries()].filter(([, n]) => n >= 2).map(([b, n]) => ({ u: urun.get(b)!, n, oran: n / (tek.get(a) ?? 1) })).sort((x, y) => y.n - x.n || y.oran - x.oran).slice(0, 5);
    if (l.length) r.set(a, l);
  }
  yanindaOnbellek.set(db, r); return r;
}

// ======================= PAHALIYA ALINANLAR =======================
export interface PahaliAlim { h: Hareket; u: Urun; tedarikci: string; fiyat: number; ref: { fiyat: number; ad: string; tarih: string }; fazla: number; oran: number }
/**
 * Dönemdeki her alış faturası satırı, aynı ürünün önceki 90 gündeki en ucuz alışıyla karşılaştırılır.
 * Yalnız daha ucuz alınan yer BAŞKA bir tedarikçiyse ve fark %5'ten fazlaysa listelenir (aynı firmanın zammı burada sayılmaz).
 */
export function pahaliAlimlar(db: DB, d: Donem): PahaliAlim[] {
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const alis = db.hareketler.filter((h) => h.tur === 'alis' && !h.yok_say && h.kaynak === 'fatura' && h.cari_ad && h.alis_fiyati > 0 && h.miktar > 0)
    .sort((a, b) => a.tarih.localeCompare(b.tarih));
  const urunAlis = new Map<ID, Hareket[]>();
  for (const h of alis) { const l = urunAlis.get(h.urun_id) ?? []; l.push(h); urunAlis.set(h.urun_id, l); }
  const sonuc: PahaliAlim[] = [];
  for (const [id, l] of urunAlis) {
    const u = urun.get(id); if (!u) continue;
    for (let i = 0; i < l.length; i++) {
      const h = l[i]; const g = gunu(h.tarih); if (g < d.bas || g > d.bit) continue;
      const t = gun(h.tarih); let ref: Hareket | null = null;
      for (let j = i - 1; j >= 0; j--) { const o = l[j]; const to = gun(o.tarih); if (t - to > 90 * 864e5) break; if (to >= t) continue; if (!ref || o.alis_fiyati < ref.alis_fiyati) ref = o; }
      if (!ref || ref.cari_ad === h.cari_ad) continue;
      const fark = h.alis_fiyati - ref.alis_fiyati; if (fark <= 0 || h.alis_fiyati < ref.alis_fiyati * 1.05) continue;
      sonuc.push({ h, u, tedarikci: h.cari_ad!, fiyat: h.alis_fiyati, ref: { fiyat: ref.alis_fiyati, ad: ref.cari_ad!, tarih: ref.tarih }, fazla: fark * h.miktar, oran: (h.alis_fiyati / ref.alis_fiyati - 1) * 100 });
    }
  }
  return sonuc.sort((a, b) => b.fazla - a.fazla);
}

// ======================= PERFORMANS (personel / müşteri) =======================
export interface Performans {
  anahtar: string; ad: string; guid?: string | null; ciro: number; ciroNet: number; kar: number; maliyetsizCiro: number;
  liste: number; indirim: number; belge: number; satir: number; son: string; marj: number; perakende?: boolean;
}
function topla(db: DB, d: Donem, anahtar: (h: Hareket) => { k: string; ad: string; guid?: string | null; perakende?: boolean } | null): Performans[] {
  const urun = new Map(db.urunler.map((u) => [u.id, u])); const gecis = gecisBelgeleri(db);
  const m = new Map<string, Performans & { _b: Set<string> }>();
  for (const h of gecerliHareketler(db, d)) {
    if (h.tur !== 'satis' || (h.belge_guid && gecis.has(h.belge_guid))) continue;
    const a = anahtar(h); if (!a) continue;
    const x = m.get(a.k) ?? { anahtar: a.k, ad: a.ad, guid: a.guid, perakende: a.perakende, ciro: 0, ciroNet: 0, kar: 0, maliyetsizCiro: 0, liste: 0, indirim: 0, belge: 0, satir: 0, son: '', marj: 0, _b: new Set<string>() };
    const t = hareketTutar(h, db.ayarlar); const u = urun.get(h.urun_id);
    x.ciro += t.ciro; x.satir++; x._b.add(h.belge_guid ?? h.tarih.slice(0, 10));
    if (t.maliyetYok) x.maliyetsizCiro += t.ciroNet; else { x.ciroNet += t.ciroNet; x.kar += t.kar; }
    if (u && u.satis_fiyati > 0) { const l = h.miktar * u.satis_fiyati; x.liste += l; x.indirim += Math.max(0, l - t.ciro); }
    if (h.tarih > x.son) x.son = h.tarih;
    m.set(a.k, x);
  }
  return [...m.values()].map(({ _b, ...x }) => ({ ...x, belge: _b.size, marj: x.ciroNet > 0 ? (x.kar / x.ciroNet) * 100 : 0 })).sort((a, b) => b.ciro - a.ciro);
}
/** Satışı yapan kullanıcıya göre (BizimHesap faturasındaki kullanıcı) */
export const personelPerformans = (db: DB, d: Donem) => topla(db, d, (h) => ({ k: h.kullanici || '—', ad: h.kullanici || 'Bilinmiyor' }));
/** Müşteriye (cari) göre; perakende tek satırda toplanır */
export const musteriKarlilik = (db: DB, d: Donem) => topla(db, d, (h) => {
  const per = !h.cari_guid || PERAKENDE_RE.test(h.cari_ad ?? '');
  return per ? { k: 'perakende', ad: 'Perakende (tüm faturalar)', perakende: true } : { k: h.cari_guid!, ad: h.cari_ad || 'Adsız cari', guid: h.cari_guid };
});
