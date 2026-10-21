import type { DB, Urun } from './types';
import { birimKar, netAlis, stokluMu } from './analiz';
import { onerilenFiyat, sonAlislar } from './analiz2';
import { gunu } from './format';

/** Ürün başına fiyat / maliyet durumu (Fiyat & Marj sayfası ve Ürünler > Fiyat uyarıları aynı hesabı kullanır) */
export interface FiyatSatir {
  u: Urun; bk: ReturnType<typeof birimKar>; son: { tarih: string; fiyat: number; tedarikci?: string | null } | undefined;
  /** son faturadaki alış, karttaki alıştan %2'den fazla yüksek */
  maliyetArtti: boolean;
  /** maliyet arttı ve satış fiyatı son alıştan sonra hiç değişmedi */
  fiyatGuncellenmedi: boolean;
  guncelMaliyet: number; oneri: number | null; marjGuncel: number | null; hedefU: number;
}

export function fiyatSatirlari(db: DB, hedef: number): FiyatSatir[] {
  const a = db.ayarlar; const sonAl = sonAlislar(db);
  // ürünün satış fiyatının en son değiştiği gün
  const satisDegisim = new Map<string, string>();
  for (const f of db.fiyat_gecmisi) if (f.satis_eski !== f.satis_yeni) { const g = gunu(f.tarih); if (g > (satisDegisim.get(f.urun_id) ?? '')) satisDegisim.set(f.urun_id, g); }
  return db.urunler.filter((u) => u.aktif && u.satis_fiyati > 0 && stokluMu(u)).map((u) => {
    const bk = birimKar(u, a); const s = sonAl.get(u.id);
    const guncelMaliyet = Math.max(u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, a) : 0, s?.fiyat ?? 0);
    const oneri = onerilenFiyat(u, guncelMaliyet, hedef);
    const marjGuncel = guncelMaliyet > 0 ? ((bk.satisNet - guncelMaliyet) / bk.satisNet) * 100 : null;
    const maliyetArtti = !!s && u.alis_fiyati > 0 && s.fiyat > netAlis(u.alis_fiyati, u.kdv, a) * 1.02;
    const fiyatGuncellenmedi = maliyetArtti && !!s && (satisDegisim.get(u.id) ?? '') < s.tarih;
    return { u, bk, son: s, maliyetArtti, fiyatGuncellenmedi, guncelMaliyet, oneri, marjGuncel, hedefU: hedef };
  });
}
