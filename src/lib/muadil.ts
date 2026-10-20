import type { DB, Urun } from './types';

/** Muadil kaynakları: (1) Otomarmara B4B eşdeğer listesi (ihtiyaç anında çekilir), (2) BizimHesap kartındaki "etiket" alanında OEM / muadil kodları virgülle yazılı.
 *  Aynı kategoride olup en az 2 ortak kodu bulunan ürünler birbirinin muadili sayılır
 *  (etiketlerde aynı aracın başka parçalarının kodları da bulunabildiği için tek kod yetmez). */
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const kodlar = (u: Urun) => new Set((u.etiket ?? '').split(',').map(norm).filter((k) => k.length >= 4));

const onbellek = new WeakMap<Urun[], { om: unknown; bul: (u: Urun) => Urun[] }>();

/** Otomarmara'dan gelen eşdeğer listesi: ürün id → bizdeki eşdeğer ürünler (iki yönlü; kategori şartı yok, Otomarmara eşleştirmesi esas) */
function otomarmaraEsdeger(db: DB) {
  const m = new Map<string, Set<string>>(); const veri = db.otomarmara_veri ?? []; if (!veri.length) return m;
  const kodIdx = new Map<string, string>(); for (const u of db.urunler) if (u.aktif && u.kod) kodIdx.set(norm(u.kod), String(u.id));
  const ekle = (a: string, b: string) => { if (a === b) return; (m.get(a) ?? m.set(a, new Set()).get(a)!).add(b); (m.get(b) ?? m.set(b, new Set()).get(b)!).add(a); };
  for (const v of veri) for (const e of v.esdegerler ?? []) { const id = kodIdx.get(norm(e.kod)); if (id) ekle(String(v.urun_id), id); }
  return m;
}

export function muadilBulucu(db: DB): (u: Urun) => Urun[] {
  const hazir = onbellek.get(db.urunler); if (hazir && hazir.om === db.otomarmara_veri) return hazir.bul;
  const om = otomarmaraEsdeger(db); const idMap = new Map(db.urunler.map((u) => [String(u.id), u]));
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
    const l0 = [...say.entries()].filter(([, n]) => n >= 2).map(([v]) => v);
    for (const vid of om.get(id) ?? []) { const v = idMap.get(vid); if (v?.aktif && !l0.some((x) => String(x.id) === vid)) l0.push(v); }
    const l = l0.sort((a, b) => b.stok - a.stok);
    sonuc.set(id, l); return l;
  };
  onbellek.set(db.urunler, { om: db.otomarmara_veri, bul }); return bul;
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
