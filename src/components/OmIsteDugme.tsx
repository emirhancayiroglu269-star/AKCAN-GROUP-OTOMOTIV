import { RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import type { Urun } from '../lib/types';

/** Listedeki bitmiş ürünler için Otomarmara'dan OEM/eşdeğer iste (hiç alınmamış ya da 90 günden eski olanlar; en fazla 50) */
export function OmIsteDugme({ urunler }: { urunler: Urun[] }) {
  const { db, calistir, mode, izin } = useStore();
  if (mode !== 'bulut' || !izin('urun')) return null;
  const sinir = Date.now() - 90 * 864e5;
  const v = new Map((db.otomarmara_veri ?? []).map((x) => [String(x.urun_id), x]));
  const aday = urunler.filter((u) => { const x = v.get(String(u.id)); return !x || (x.durum !== 'istendi' && new Date(x.guncelleme ?? x.istendi).getTime() < sinir); }).slice(0, 50);
  const bekleyen = urunler.filter((u) => v.get(String(u.id))?.durum === 'istendi').length;
  if (!aday.length && !bekleyen) return null;
  return (
    <button className="btn-ghost" disabled={!aday.length} title="Otomarmara B4B sekmesinde 'Otomarmara Muadil' yer imi açıkken sırayla işlenir"
      onClick={() => calistir(() => backend.omIste(aday.map((u) => u.id)), `${aday.length} ürün Otomarmara'ya soruldu`)}>
      <RefreshCw size={16} /> {aday.length ? `Bitenlerin muadillerini Otomarmara'dan iste (${aday.length})` : `Otomarmara'da sırada: ${bekleyen}`}
    </button>
  );
}
