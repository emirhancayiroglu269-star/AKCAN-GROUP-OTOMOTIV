import type { Urun } from './types';

/**
 * otoparcasan.com arama bağlantısı. Program siteden veri ÇEKMEZ; bağlantı kullanıcının kendi tarayıcısında yeni sekmede açılır.
 * Arama terimi: stok kodundaki marka ön eki atılmış üretici kodu (BOS-0241140537 → 0241140537); yoksa stok kodu / etiketteki ilk kod.
 */
export function otoparcasanTerim(u: Pick<Urun, 'kod' | 'etiket'>): string | null {
  const kod = (u.kod ?? '').trim();
  const m = kod.match(/^[A-ZÇĞİÖŞÜ]{2,4}-(.+)$/i);
  if (m && m[1].replace(/[^0-9A-Za-z]/g, '').length >= 4) return m[1].trim();
  if (kod.length >= 4) return kod;
  const et = (u.etiket ?? '').split(/[,;\s]+/).map((x) => x.trim()).find((x) => x.replace(/[^0-9A-Za-z]/g, '').length >= 4);
  return et ?? null;
}
export function otoparcasanAra(u: Pick<Urun, 'kod' | 'etiket'>): string | null {
  const t = otoparcasanTerim(u);
  return t ? `https://otoparcasan.com/arama-sonucu?s=${encodeURIComponent(t)}` : null;
}
