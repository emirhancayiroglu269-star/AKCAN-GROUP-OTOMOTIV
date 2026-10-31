import type { DB, StokAksiyon } from './types';

/**
 * "Şimdilik alma": stoğu bitmiş ama muadili rafta olan / bir daha alınmayacak / özel siparişle gelen ürünler alınacaklar listesinden gizlenir.
 * Kalıcı değildir: ürüne yeniden stok girerse (işaretten sonra alış faturası ya da stok artışı) işaret kendiliğinden kalkar;
 * stok tekrar biterse ürün listeye yine düşer.
 */
export function almaDurumu(db: DB) {
  const aktif = db.stok_aksiyon.filter((a) => a.aksiyon === 'alma' && a.durum === 'planlandi');
  const gizli = new Map<string, StokAksiyon>(); const kalkacak: StokAksiyon[] = [];
  if (!aktif.length) return { gizli, kalkacak };
  const urun = new Map(db.urunler.map((u) => [u.id, u]));
  const sonAlis = new Map<string, number>();
  for (const h of db.hareketler) if (h.tur === 'alis' && !h.yok_say && h.miktar > 0) { const t = new Date(h.tarih).getTime(); if (t > (sonAlis.get(h.urun_id) ?? 0)) sonAlis.set(h.urun_id, t); }
  for (const a of aktif) {
    const u = urun.get(a.urun_id); const bas = new Date(a.olusturma ?? 0).getTime();
    const stokGirdi = (sonAlis.get(a.urun_id) ?? 0) > bas || (!!u && u.stok > Math.max(0, a.baslangic_stok ?? 0));
    if (stokGirdi) kalkacak.push(a); else gizli.set(a.urun_id, a);
  }
  return { gizli, kalkacak };
}
