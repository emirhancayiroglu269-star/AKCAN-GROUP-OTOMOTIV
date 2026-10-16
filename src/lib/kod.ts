import type { DB, ID, Urun, UrunKodu } from './types';
import { ara, kodNorm } from './format';

/** urun_id → OEM/muadil kodları */
export function kodHaritasi(db: DB) {
  const m = new Map<ID, UrunKodu[]>();
  for (const k of db.urun_kodlari) { const l = m.get(k.urun_id); if (l) l.push(k); else m.set(k.urun_id, [k]); }
  return m;
}

export interface AramaSonucu { urun: Urun; eslesenKod?: UrunKodu | null }

/**
 * Ürün arama: ad/kod/barkod/marka/kategori/raf metin araması + OEM/muadil kod araması.
 * Kod araması boşluk, nokta ve tireyi yok sayar ("4246.R1" = "424 6R1").
 */
export function urunAra(db: DB, q: string, harita: Map<ID, UrunKodu[]>, opts: { sadeceAktif?: boolean; limit?: number } = {}): AramaSonucu[] {
  const metin = q.trim();
  if (!metin) return [];
  const qn = kodNorm(metin);
  const kodla = qn.length >= 3;
  const sonuc: AramaSonucu[] = [];
  const kodEslesen: AramaSonucu[] = [];
  for (const u of db.urunler) {
    if (opts.sadeceAktif !== false && !u.aktif) continue;
    if (ara(metin, u.ad, u.kod, u.barkod, u.marka, u.kategori, u.raf)) { sonuc.push({ urun: u }); continue; }
    if (!kodla) continue;
    if (kodNorm(u.kod).includes(qn) || kodNorm(u.barkod).includes(qn)) { sonuc.push({ urun: u }); continue; }
    const k = harita.get(u.id)?.find((x) => (x.kod_norm ?? kodNorm(x.kod)).includes(qn));
    if (k) kodEslesen.push({ urun: u, eslesenKod: k });
  }
  // Tam kod eşleşmesi en üstte, sonra metin eşleşmeleri, sonra kısmi kod eşleşmeleri
  kodEslesen.sort((a, b) => Number((b.eslesenKod?.kod_norm ?? '') === qn) - Number((a.eslesenKod?.kod_norm ?? '') === qn));
  const tam = kodEslesen.filter((x) => (x.eslesenKod?.kod_norm ?? '') === qn);
  const kismi = kodEslesen.filter((x) => (x.eslesenKod?.kod_norm ?? '') !== qn);
  const hepsi = [...tam, ...sonuc, ...kismi];
  return opts.limit ? hepsi.slice(0, opts.limit) : hepsi;
}
