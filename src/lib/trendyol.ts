import type { DB, Urun } from './types';
import type { TySatir, TySiparis, TyUrun } from './backend';
import { netAlis, stokluMu } from './analiz';
import { sonAlislar } from './analiz2';
import { gunu } from './format';

export interface TyVarsayim { komisyon: number; kargo: number; hizmet: number; stopaj: number; hedef_marj: number; taban_marj: number; tavan_yuzde: number }
/** Varsayılanlar: kullanıcı Trendyol sayfasından kendi değerlerini girer */
export const TY_VARSAYILAN: TyVarsayim = { komisyon: 20, kargo: 100, hizmet: 0, stopaj: 1, hedef_marj: 15, taban_marj: 5, tavan_yuzde: 10 };

/** Satıcının ürün başına güncel maliyeti (KDV hariç): BizimHesap alışı ile son fatura alışının büyüğü */
export function maliyet(db: DB, u: Urun, son = sonAlislar(db)) {
  return Math.max(u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, db.ayarlar) : 0, son.get(u.id)?.fiyat ?? 0);
}

/**
 * Trendyol satışında birim kâr (KDV hariç).
 * P: Trendyol satış fiyatı (KDV dahil) · komisyon, kargo, hizmet bedeli KDV'li giderdir (KDV'si indirilir) · stopaj satış tutarından kesilir.
 */
export function tyKar(P: number, alisNet: number, kdv: number, v: TyVarsayim, komisyon = v.komisyon) {
  const net = P / (1 + kdv / 100);
  const gider = (P * komisyon / 100 + v.kargo + v.hizmet) / 1.2 + P * v.stopaj / 100;
  const kar = net - gider - alisNet;
  return { kar, marj: net > 0 ? (kar / net) * 100 : 0, gider, net };
}
/** Hedef marja ulaşan Trendyol fiyatı (KDV dahil, 0,90'a yuvarlanır); hesaplanamıyorsa null */
export function tyHedefFiyat(alisNet: number, kdv: number, v: TyVarsayim, komisyon = v.komisyon) {
  if (!(alisNet > 0)) return null;
  const pay = (1 - v.hedef_marj / 100) / (1 + kdv / 100) - komisyon / 100 / 1.2 - v.stopaj / 100;
  if (pay <= 0) return null;
  const P = (alisNet + (v.kargo + v.hizmet) / 1.2) / pay;
  return Math.ceil(P) - 0.1;
}

/**
 * Rekabetçi Trendyol fiyatı (sunucudaki satisFiyati ile aynı): kâr hedefli fiyat, dükkân fiyatının %tavan üstünü geçmez,
 * ama taban marjın altına inmez (zararına satış olmaz). Hesaplanamıyorsa null.
 */
export function tyOneriFiyat(alisNet: number, kdv: number, v: TyVarsayim, komisyon: number, dukkan: number) {
  const taban = tyHedefFiyat(alisNet, kdv, { ...v, hedef_marj: Math.max(0, v.taban_marj ?? 5) }, komisyon);
  if (!taban) return null;
  const hedef = tyHedefFiyat(alisNet, kdv, v, komisyon) ?? taban;
  const tavan = dukkan > 0 && (v.tavan_yuzde ?? 10) >= 0 ? Math.ceil(dukkan * (1 + (v.tavan_yuzde ?? 10) / 100)) - 0.1 : Infinity;
  return Math.max(taban, Math.min(hedef, tavan));
}

/** Siparişlerden barkod başına gerçek komisyon oranı (%) — Trendyol kategoriye göre farklı oran keser */
export function komisyonOranlari(siparisler: TySiparis[]) {
  const m = new Map<string, number>();
  for (const s of siparisler) for (const l of s.satirlar) if (l.barkod && l.komisyon !== null && l.komisyon > 0 && l.komisyon <= 60 && !m.has(l.barkod)) m.set(l.barkod, l.komisyon);
  return m;
}
/** Satırın komisyon tutarı (alan oran olarak geliyorsa tutara çevrilir) */
export function satirKomisyon(l: TySatir) {
  const tutar = (l.birim_fiyat ?? 0) * l.adet - (l.indirim ?? 0);
  if (l.komisyon === null) return null;
  return l.komisyon <= 60 ? tutar * l.komisyon / 100 : l.komisyon;
}
export const IPTAL_RE = /cancel|iptal|unsupplied|returned|iade|undelivered/i;

/** Trendyol'a uygun ürün önerisi: stokta, barkodlu, düzenli satılan, Trendyol'da ilanı olmayan, hedef fiyatı makul */
export function tyOneriler(db: DB, tyUrunler: TyUrun[], v: TyVarsayim) {
  const ilanli = new Set(tyUrunler.map((x) => x.urun_id).filter(Boolean));
  const ilanBarkod = new Set(tyUrunler.map((x) => x.barkod));
  const son = sonAlislar(db); const sinir = gunu(new Date(Date.now() - 179 * 864e5));
  const satis = new Map<string, { adet: number; belge: Set<string> }>();
  for (const h of db.hareketler) {
    if (h.tur !== 'satis' || h.yok_say || gunu(h.tarih) < sinir) continue;
    const x = satis.get(h.urun_id) ?? { adet: 0, belge: new Set<string>() }; x.adet += h.miktar; x.belge.add(h.belge_guid ?? h.tarih.slice(0, 10)); satis.set(h.urun_id, x);
  }
  return db.urunler.filter((u) => u.aktif && stokluMu(u) && u.stok > 0 && !ilanli.has(u.id) && !(u.barkod && ilanBarkod.has(u.barkod))).flatMap((u) => {
    const a = maliyet(db, u, son); if (!(a > 0)) return [];
    const s = satis.get(u.id); const hedef = tyOneriFiyat(a, u.kdv, v, v.komisyon, u.satis_fiyati); if (!hedef) return [];
    const k = tyKar(hedef, a, u.kdv, v);
    return [{ u, alis: a, hedef, kar: k.kar, satis6: s?.adet ?? 0, belge: s?.belge.size ?? 0, barkodVar: !!(u.barkod ?? '').trim(),
      // dükkân fiyatına göre Trendyol fiyatı ne kadar yukarıda (çok yüksekse rekabet zor)
      fark: u.satis_fiyati > 0 ? (hedef / u.satis_fiyati - 1) * 100 : null }];
  }).sort((x, y) => (y.belge >= 3 ? 1 : 0) - (x.belge >= 3 ? 1 : 0) || y.satis6 * y.kar - x.satis6 * x.kar);
}
