import type { DB, Urun } from './types';

/** BizimHesap kartındaki "etiket" alanında OEM / muadil kodları virgülle yazılı.
 *  Aynı kategoride olup en az 2 ortak kodu bulunan ürünler birbirinin muadili sayılır
 *  (etiketlerde aynı aracın başka parçalarının kodları da bulunabildiği için tek kod yetmez). */
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const kodlar = (u: Urun) => new Set((u.etiket ?? '').split(',').map(norm).filter((k) => k.length >= 4));

const onbellek = new WeakMap<Urun[], (u: Urun) => Urun[]>();

export function muadilBulucu(db: DB): (u: Urun) => Urun[] {
  const hazir = onbellek.get(db.urunler); if (hazir) return hazir;
  const ks = new Map<string, Set<string>>(); const idx = new Map<string, Urun[]>();
  for (const u of db.urunler) {
    if (!u.aktif) continue; const k = kodlar(u); ks.set(String(u.id), k);
    for (const c of k) { const l = idx.get(c); if (!l) idx.set(c, [u]); else if (!l.some((x) => String(x.id) === String(u.id))) l.push(u); }
  }
  const sonuc = new Map<string, Urun[]>();
  const bul = (u: Urun) => {
    const id = String(u.id); const s = sonuc.get(id); if (s) return s;
    const benim = ks.get(id) ?? kodlar(u); const say = new Map<Urun, number>();
    const tekil = new Map<string, Urun>();
    for (const c of benim) for (const v of idx.get(c) ?? []) if (String(v.id) !== id && v.kategori === u.kategori) { const vid = String(v.id); tekil.set(vid, v); say.set(tekil.get(vid)!, (say.get(tekil.get(vid)!) ?? 0) + 1); }
    const l = [...say.entries()].filter(([, n]) => n >= 2).map(([v]) => v).sort((a, b) => b.stok - a.stok);
    sonuc.set(id, l); return l;
  };
  onbellek.set(db.urunler, bul); return bul;
}

/** Stokta olan muadiller ("SRD-SA2481 (3)" biçiminde kısa metinle) */
export function stoktakiMuadiller(db: DB, u: Urun) { return muadilBulucu(db)(u).filter((v) => v.stok > 0); }
/** Depo bazında: o depoda stokta olan muadiller */
export function depoMuadil(db: DB, u: Urun) {
  const ds = new Map<string, number>(); for (const x of db.urun_depo_stok) ds.set(`${x.urun_id}|${x.depo_id}`, Number(x.miktar) || 0);
  const m = muadilBulucu(db)(u);
  return db.depolar.filter((d) => d.aktif !== false).map((d) => ({ depo: d, muadil: m.map((v) => ({ v, adet: ds.get(`${v.id}|${d.id}`) ?? 0 })).filter((x) => x.adet > 0) }));
}
export const depoKisa = (ad: string) => ad.replace(/\s*DEPO(SU)?\s*$/i, '').trim();
export const muadilMetin = (l: Urun[]) => l.map((v) => `${v.kod || v.ad.slice(0, 20)} (${Math.round(v.stok)})`).join(', ');
