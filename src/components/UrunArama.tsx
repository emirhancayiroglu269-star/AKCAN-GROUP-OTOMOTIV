import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { para, sayi } from '../lib/format';
import { depoStogu } from '../lib/depo';
import { kodHaritasi, urunAra, type AramaSonucu } from '../lib/kod';
import type { Urun } from '../lib/types';

/** Barkod okutma + isim/kod araması. Enter: tam barkod eşleşmesi veya ilk sonuç seçilir. */
export function UrunArama({ sec, otoOdak, placeholder = 'Barkod okut veya ürün adı / kodu / OEM kodu yaz…', depoId }: { sec: (u: Urun) => void; otoOdak?: boolean; placeholder?: string; depoId?: string | null }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [aktif, setAktif] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const harita = useMemo(() => kodHaritasi(db), [db]);
  const bulunan: AramaSonucu[] = useMemo(() => urunAra(db, q, harita, { limit: 10 }), [q, db, harita]);
  const sonuc = bulunan.map((x) => x.urun);

  const secVe = (u: Urun) => { sec(u); setQ(''); setAktif(0); ref.current?.focus(); };
  const tus = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAktif((a) => Math.min(a + 1, sonuc.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAktif((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const tam = db.urunler.find((u) => u.aktif && u.barkod && u.barkod === q.trim());
      const u = tam ?? sonuc[aktif]; if (u) secVe(u);
    } else if (e.key === 'Escape') setQ('');
  };

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input ref={ref} autoFocus={otoOdak} className="inp pl-9" placeholder={placeholder} value={q}
        onChange={(e) => { setQ(e.target.value); setAktif(0); }} onKeyDown={tus} data-urun-arama />
      {sonuc.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {sonuc.map((u, i) => (
            <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); secVe(u); }} onMouseEnter={() => setAktif(i)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === aktif ? 'bg-marka-50 dark:bg-slate-800' : ''}`}>
              <div className="min-w-0">
                <div className="truncate font-medium">{u.ad}</div>
                <div className="truncate text-xs text-slate-500">{[u.kod, u.marka, u.raf && 'Raf ' + u.raf].filter(Boolean).join(' · ')}</div>
                {bulunan[i]?.eslesenKod && <div className="mt-0.5"><span className="rozet bg-sky-100 text-sky-700">{bulunan[i].eslesenKod!.tur}: {bulunan[i].eslesenKod!.kod}</span></div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold">{para(u.satis_fiyati)}</div>
                {(() => { const st = depoStogu(db, u.id, depoId); return (
                  <div className={`text-xs ${st <= 0 ? 'text-red-600' : st < u.kritik_stok ? 'text-amber-600' : 'text-slate-500'}`}>
                    {depoId ? 'Depo' : 'Stok'}: {sayi(st)}{depoId && st !== u.stok ? <span className="text-slate-400"> / top. {sayi(u.stok)}</span> : null}
                  </div>); })()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

