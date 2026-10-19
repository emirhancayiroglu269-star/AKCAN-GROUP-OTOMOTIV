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
    for (const c of k) { const l = idx.get(c); if (l) l.push(u); else idx.set(c, [u]); }
  }
  const sonuc = new Map<string, Urun[]>();
  const bul = (u: Urun) => {
    const id = String(u.id); const s = sonuc.get(id); if (s) return s;
    const benim = ks.get(id) ?? kodlar(u); const say = new Map<Urun, number>();
    for (const c of benim) for (const v of idx.get(c) ?? []) if (String(v.id) !== id && v.kategori === u.kategori) say.set(v, (say.get(v) ?? 0) + 1);
    const l = [...say.entries()].filter(([, n]) => n >= 2).map(([v]) => v).sort((a, b) => b.stok - a.stok);
    sonuc.set(id, l); return l;
  };
  onbellek.set(db.urunler, bul); return bul;
}

/** Stokta olan muadiller ("SRD-SA2481 (3)" biçiminde kısa metinle) */
export function stoktakiMuadiller(db: DB, u: Urun) { return muadilBulucu(db)(u).filter((v) => v.stok > 0); }
export const muadilMetin = (l: Urun[]) => l.map((v) => `${v.kod || v.ad.slice(0, 20)} (${Math.round(v.stok)})`).join(', ');
