import { useState } from 'react';
import { gunu } from '../lib/format';
import type { Donem } from '../lib/analiz';
import { useStore } from '../lib/store';

const gun = (fark: number) => gunu(new Date(Date.now() - fark * 864e5));
const ayBasi = (ay = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - ay); return gunu(d); };
const ayBitis = (ay: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - ay + 1); d.setDate(0); return gunu(d); };

export function donemHazirlari(takip?: string | null, raporIlk?: string | null): { ad: string; d: Donem }[] {
  return [
    { ad: 'Bugün', d: { bas: gunu(), bit: gunu() } }, { ad: 'Dün', d: { bas: gun(1), bit: gun(1) } },
    { ad: 'Son 7 gün', d: { bas: gun(6), bit: gunu() } }, { ad: 'Son 30 gün', d: { bas: gun(29), bit: gunu() } },
    { ad: 'Bu ay', d: { bas: ayBasi(), bit: gunu() } }, { ad: 'Geçen ay', d: { bas: ayBasi(1), bit: ayBitis(1) } },
    { ad: 'Bu yıl', d: { bas: `${new Date().getFullYear()}-01-01`, bit: gunu() } },
    { ad: 'Tüm veri', d: { bas: raporIlk ?? (takip ? gunu(takip) : gun(365)), bit: gunu() } },
  ];
}

/** Sayfalar arasında ortak, oturum boyunca hatırlanan dönem */
export function useDonem(varsayilan = 'Son 30 gün'): [Donem, (d: Donem) => void] {
  const { db } = useStore();
  const [d, setD] = useState<Donem>(() => {
    try { const s = sessionStorage.getItem('donem'); if (s) return JSON.parse(s) as Donem; } catch { /* yok */ }
    return donemHazirlari(db.bh_durum?.takip_baslangic, db.bh_durum?.rapor_ilk).find((x) => x.ad === varsayilan)!.d;
  });
  const sec = (x: Donem) => { setD(x); try { sessionStorage.setItem('donem', JSON.stringify(x)); } catch { /* yok */ } };
  return [d, sec];
}

export function DonemSecici({ d, sec }: { d: Donem; sec: (d: Donem) => void }) {
  const { db } = useStore();
  const hazir = donemHazirlari(db.bh_durum?.takip_baslangic, db.bh_durum?.rapor_ilk);
  const aktif = hazir.find((x) => x.d.bas === d.bas && x.d.bit === d.bit)?.ad;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hazir.map((x) => (
        <button key={x.ad} onClick={() => sec(x.d)}
          className={`rounded-full px-3 py-1 text-xs transition ${aktif === x.ad ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300'}`}>{x.ad}</button>
      ))}
      <input type="date" className="inp w-36 py-1 text-xs" value={d.bas} max={d.bit} onChange={(e) => e.target.value && sec({ ...d, bas: e.target.value })} />
      <span className="text-slate-400">—</span>
      <input type="date" className="inp w-36 py-1 text-xs" value={d.bit} min={d.bas} onChange={(e) => e.target.value && sec({ ...d, bit: e.target.value })} />
    </div>
  );
}
