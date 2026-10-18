import type { DB } from './types';
import { gunu } from './format';
import { netAlis } from './analiz';

/** Kartta yazan alış, son 6 aydaki son faturanın iskonto sonrası net fiyatından %30'dan fazla yüksekse
 *  (genelde kartta iskontosuz liste fiyatı durur) analizlerde fatura fiyatı kullanılır. BizimHesap'a yazılmaz;
 *  kart düzeltilince kendiliğinden kart fiyatına dönülür. */
export const FATURA_ALIS_GUN = 180;

export function faturaAlisUygula(db: DB): DB {
  const a = db.ayarlar ?? ({} as DB['ayarlar']);
  const sinir = gunu(new Date(Date.now() - FATURA_ALIS_GUN * 864e5));
  const son = new Map<string, { tarih: string; fiyat: number; tedarikci?: string | null }>();
  for (const h of db.hareketler) {
    if (h.tur !== 'alis' || h.kaynak !== 'fatura' || !(h.alis_fiyati > 0)) continue;
    const g = gunu(h.tarih); if (g < sinir) continue;
    const o = son.get(String(h.urun_id)); if (!o || g > o.tarih) son.set(String(h.urun_id), { tarih: g, fiyat: h.alis_fiyati, tedarikci: h.cari_ad });
  }
  let degisti = false;
  const urunler = db.urunler.map((u) => {
    const s = son.get(String(u.id));
    if (!s || !(u.alis_fiyati > 0) || !(netAlis(u.alis_fiyati, u.kdv, a) > s.fiyat * 1.3)) return u;
    degisti = true;
    const kartKarsiligi = a.alis_kdv_haric ? s.fiyat : s.fiyat * (1 + (Number(u.kdv) || 0) / 100);
    return { ...u, alis_fiyati: Math.round(kartKarsiligi * 100) / 100, kart_alis: u.alis_fiyati, alis_fatura: { tarih: s.tarih, tedarikci: s.tedarikci ?? null } };
  });
  return degisti ? { ...db, urunler } : db;
}
