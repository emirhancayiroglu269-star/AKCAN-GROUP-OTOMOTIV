import type { DB, ID, Urun } from './types';
import { kodNorm } from './format';
import { aracCikar } from './analiz3';

/**
 * "Ürün Ara" sayfasının arama motoru.
 * Kaynaklar: stok kodu / barkod, OEM kodları (Otomarmara'dan gelen + BizimHesap etiketi), Otomarmara eşdeğer kodları,
 * ürün adı / marka / kategori / raf ve addaki araç-model bilgisi ("megane 3 balata").
 */

/** Türkçe karakterleri ve Romen rakamlarını sadeleştirir: "Megane III Ön Balata" → "MEGANE 3 ON BALATA" */
const ROMEN: Record<string, string> = { II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8' };
export function katla(s?: string | null) {
  return (s ?? '').replace(/i/g, 'İ').toUpperCase()
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, ' ').trim()
    .replace(/(^| )(II|III|IV|VI|VII|VIII|V)(?= |$)/g, (_m, a: string, r: string) => a + ROMEN[r]);
}

export type EslesmeTur = 'kod' | 'barkod' | 'oem' | 'esdeger' | 'kismi' | 'metin';
export interface AramaSatiri { u: Urun; tur: EslesmeTur; etiket?: string; puan: number }

interface Dizin {
  urun: Urun[];
  metin: Map<ID, string>;
  /** normal kod → ürünler (stok kodu, barkod) */
  kod: Map<string, Urun[]>;
  /** normal OEM kodu → [ürün, görünen kod] */
  oem: Map<string, { u: Urun; kod: string }[]>;
  /** normal eşdeğer kodu → [ürün, görünen kod] (ürünün Otomarmara eşdeğer listesinde geçen kod) */
  esdeger: Map<string, { u: Urun; kod: string }[]>;
  /** kısmi kod araması için: ürün → kodları birleşik */
  kodlar: Map<ID, string>;
}

const onbellek = new WeakMap<DB, Dizin>();
function ekle<T>(m: Map<string, T[]>, k: string, v: T) { if (!k) return; const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); }

export function dizin(db: DB): Dizin {
  const h = onbellek.get(db); if (h) return h;
  const urun = db.urunler.filter((u) => u.aktif);
  const id = new Map(urun.map((u) => [String(u.id), u]));
  const metin = new Map<ID, string>(), kod = new Map<string, Urun[]>(), oem = new Map<string, { u: Urun; kod: string }[]>(), esdeger = new Map<string, { u: Urun; kod: string }[]>(), kodlar = new Map<ID, string>();
  for (const u of urun) {
    const a = aracCikar(u.ad);
    metin.set(u.id, ' ' + katla([u.ad, u.marka, u.kategori, u.kod, u.barkod, u.raf ? 'RAF ' + u.raf : '', a ? `${a.marka} ${a.model ?? ''}` : ''].filter(Boolean).join(' ')) + ' ');
    ekle(kod, kodNorm(u.kod), u); if (u.barkod) ekle(kod, kodNorm(u.barkod), u);
    // stok kodundaki marka ön eki olmadan da bulunsun: BOS-0241140537 → 0241140537
    const onEksiz = (u.kod ?? '').trim().match(/^[A-Za-zÇĞİÖŞÜçğıöşü]{2,4}-(.+)$/); if (onEksiz && kodNorm(onEksiz[1]).length >= 4) ekle(kod, kodNorm(onEksiz[1]), u);
    kodlar.set(u.id, [kodNorm(u.kod), kodNorm(u.barkod)].filter(Boolean).join(' '));
    for (const e of (u.etiket ?? '').split(',')) { const n = kodNorm(e); if (n.length >= 4) { ekle(oem, n, { u, kod: e.trim() }); kodlar.set(u.id, kodlar.get(u.id) + ' ' + n); } }
  }
  for (const k of db.urun_kodlari) { const u = id.get(String(k.urun_id)); if (!u) continue; const n = k.kod_norm ?? kodNorm(k.kod); if (n.length < 4) continue; if (!oem.get(n)?.some((x) => x.u === u)) ekle(oem, n, { u, kod: k.kod }); kodlar.set(u.id, kodlar.get(u.id) + ' ' + n); }
  for (const v of db.otomarmara_veri ?? []) {
    const u = id.get(String(v.urun_id)); if (!u || v.durum !== 'tamam') continue;
    for (const e of v.esdegerler ?? []) { const n = kodNorm(e.kod); if (n.length >= 4 && n !== kodNorm(u.kod)) ekle(esdeger, n, { u, kod: e.kod }); }
    if (v.om_kod) { const n = kodNorm(v.om_kod); if (n !== kodNorm(u.kod) && !oem.get(n)?.some((x) => x.u === u)) ekle(oem, n, { u, kod: v.om_kod }); }
  }
  const d = { urun, metin, kod, oem, esdeger, kodlar }; onbellek.set(db, d); return d;
}

/** Arama: tam kod > OEM > eşdeğer > kısmi kod > ad/araç metni. Aynı ürün en iyi eşleşmesiyle bir kez listelenir. */
export function genelArama(db: DB, q: string, limit = 80): AramaSatiri[] {
  const s = q.trim(); if (!s) return [];
  const d = dizin(db); const qn = kodNorm(s); const sonuc = new Map<ID, AramaSatiri>();
  const koy = (u: Urun, tur: EslesmeTur, puan: number, etiket?: string) => { const x = sonuc.get(u.id); if (!x || x.puan < puan) sonuc.set(u.id, { u, tur, puan, etiket }); };
  if (qn.length >= 3) {
    for (const u of d.kod.get(qn) ?? []) koy(u, u.barkod && kodNorm(u.barkod) === qn ? 'barkod' : 'kod', 100);
    for (const x of d.oem.get(qn) ?? []) koy(x.u, 'oem', 90, x.kod);
    for (const x of d.esdeger.get(qn) ?? []) koy(x.u, 'esdeger', 80, x.kod);
    if (qn.length >= 4) for (const u of d.urun) { if (sonuc.has(u.id)) continue; const k = d.kodlar.get(u.id) ?? ''; if (k.includes(qn)) koy(u, 'kismi', 60); }
  }
  // metin: yazılan her kelime adda / markada / kategoride / araçta geçmeli (Türkçe karaktersiz, Romen rakamları sayıya çevrilmiş)
  const kel = katla(s).split(' ').filter(Boolean);
  if (kel.length) for (const u of d.urun) {
    if (sonuc.has(u.id)) continue; const m = d.metin.get(u.id)!;
    if (kel.every((k) => (k.length <= 2 || /^\d+$/.test(k) ? m.includes(' ' + k + ' ') : m.includes(k)))) koy(u, 'metin', 50);
  }
  return [...sonuc.values()].sort((a, b) => b.puan - a.puan || Number(b.u.stok > 0) - Number(a.u.stok > 0) || b.u.stok - a.u.stok).slice(0, limit);
}

/** Otomarmara'dan gelen bir kodun bizdeki karşılığı: stok kodu, OEM ya da eşdeğer olarak kayıtlı ürünler */
export function koddanBizdeki(db: DB, kod: string): AramaSatiri[] {
  const n = kodNorm(kod); if (n.length < 3) return [];
  const d = dizin(db); const l: AramaSatiri[] = [];
  for (const u of d.kod.get(n) ?? []) l.push({ u, tur: 'kod', puan: 100 });
  for (const x of d.oem.get(n) ?? []) if (!l.some((y) => y.u === x.u)) l.push({ u: x.u, tur: 'oem', puan: 90, etiket: x.kod });
  for (const x of d.esdeger.get(n) ?? []) if (!l.some((y) => y.u === x.u)) l.push({ u: x.u, tur: 'esdeger', puan: 80, etiket: x.kod });
  return l.sort((a, b) => b.puan - a.puan || b.u.stok - a.u.stok);
}

export const ESLESME_AD: Record<EslesmeTur, string> = { kod: 'Stok kodu', barkod: 'Barkod', oem: 'OEM', esdeger: 'Otomarmara eşdeğeri', kismi: 'Kodun bir kısmı', metin: 'Ad / araç' };
