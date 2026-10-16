import { useState } from 'react';

/** Tek seriden dikey çubuk grafik (günlük satış vb.). Fareyle üzerine gelince değer görünür. */
export function CubukGrafik({ veri, bicim, yukseklik = 180, renk = '#0f9f74', bos = 'Veri yok' }: {
  veri: { etiket: string; deger: number; alt?: string }[]; bicim: (v: number) => string; yukseklik?: number; renk?: string; bos?: string;
}) {
  const [secili, setSecili] = useState<number | null>(null);
  if (!veri.length || veri.every((x) => x.deger === 0)) return <div className="grid place-items-center text-sm text-slate-400" style={{ height: yukseklik }}>{bos}</div>;
  const max = Math.max(...veri.map((x) => x.deger), 0) || 1;
  const min = Math.min(...veri.map((x) => x.deger), 0);
  const aralik = max - min || 1;
  const W = 1000, H = yukseklik, ust = 8, alt = 22;
  const ph = H - ust - alt;
  const bw = W / veri.length;
  const gap = Math.min(6, bw * 0.25);
  const y0 = ust + (max / aralik) * ph;
  const adim = Math.ceil(veri.length / 10);
  const s = secili !== null ? veri[secili] : null;
  return (
    <div className="relative" onMouseLeave={() => setSecili(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }} role="img">
        <line x1={0} x2={W} y1={y0} y2={y0} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {veri.map((x, i) => {
          const h = (Math.abs(x.deger) / aralik) * ph;
          const y = x.deger >= 0 ? y0 - h : y0;
          const r = Math.min(4, (bw - gap) / 2, h);
          const x1 = i * bw + gap / 2, w = bw - gap;
          const d = x.deger >= 0
            ? `M${x1},${y0} V${y + r} Q${x1},${y} ${x1 + r},${y} H${x1 + w - r} Q${x1 + w},${y} ${x1 + w},${y + r} V${y0} Z`
            : `M${x1},${y0} V${y + h - r} Q${x1},${y + h} ${x1 + r},${y + h} H${x1 + w - r} Q${x1 + w},${y + h} ${x1 + w},${y + h - r} V${y0} Z`;
          return (
            <g key={i} onMouseEnter={() => setSecili(i)}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {h > 0 && <path d={d} fill={x.deger < 0 ? '#dc2626' : renk} opacity={secili === null || secili === i ? 1 : 0.45} />}
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex text-[10px] text-slate-400">
        {veri.map((x, i) => <div key={i} className="flex justify-center overflow-visible whitespace-nowrap" style={{ width: `${100 / veri.length}%` }}>{i % adim === 0 ? x.etiket : ''}</div>)}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 text-[10px] text-slate-400">{bicim(max)}</div>
      {s && (
        <div className="pointer-events-none absolute top-1 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: `clamp(0px, calc(${((secili! + 0.5) / veri.length) * 100}% - 60px), calc(100% - 130px))` }}>
          <div className="font-semibold">{bicim(s.deger)}</div><div className="opacity-70">{s.alt ?? s.etiket}</div>
        </div>
      )}
    </div>
  );
}

/** Yatay çubuklu sıralı liste (kategori payı, en çok satanlar vb.) */
export function YatayListe({ veri, bicim, renk = 'bg-marka-500', limit = 10, bos = 'Veri yok' }: {
  veri: { ad: string; deger: number; alt?: string }[]; bicim: (v: number) => string; renk?: string; limit?: number; bos?: string;
}) {
  const liste = veri.slice(0, limit);
  const max = Math.max(...liste.map((x) => Math.abs(x.deger)), 0) || 1;
  if (!liste.length) return <div className="py-6 text-center text-sm text-slate-400">{bos}</div>;
  return (
    <div className="space-y-2">
      {liste.map((x, i) => (
        <div key={x.ad + i}>
          <div className="flex justify-between gap-3 text-sm"><span className="truncate" title={x.ad}>{x.ad}</span><span className="shrink-0 font-medium">{bicim(x.deger)}</span></div>
          {x.alt && <div className="text-[11px] text-slate-500">{x.alt}</div>}
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${x.deger < 0 ? 'bg-red-500' : renk}`} style={{ width: `${(Math.abs(x.deger) / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export interface Seri { ad: string; renk: string }
/** Gruplu çubuk grafik (aynı birimde birkaç seri; tek eksen). Üzerine gelince tüm seriler görünür, istenirse tablo. */
export function GrupluCubuk({ veri, seriler, bicim, yukseklik = 240, bos = 'Veri yok' }: {
  veri: { etiket: string; alt?: string; degerler: number[] }[]; seriler: Seri[]; bicim: (v: number) => string; yukseklik?: number; bos?: string;
}) {
  const [secili, setSecili] = useState<number | null>(null);
  const [tablo, setTablo] = useState(false);
  const lejant = (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      {seriler.map((s) => <span key={s.ad} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.renk }} />{s.ad}</span>)}
      <button className="ml-auto text-marka-600 hover:underline" onClick={() => setTablo(!tablo)}>{tablo ? 'Grafik' : 'Tablo'}</button>
    </div>
  );
  if (!veri.length || veri.every((x) => x.degerler.every((v) => v === 0))) return <div className="grid place-items-center text-sm text-slate-400" style={{ height: yukseklik }}>{bos}</div>;
  if (tablo) return (<div>{lejant}<div className="overflow-auto" style={{ maxHeight: yukseklik + 40 }}><table className="tbl"><thead><tr><th>Dönem</th>{seriler.map((s) => <th key={s.ad} className="text-right">{s.ad}</th>)}</tr></thead>
    <tbody>{veri.map((x) => <tr key={x.etiket}><td>{x.alt ?? x.etiket}</td>{x.degerler.map((v, i) => <td key={i} className={`text-right ${v < 0 ? 'text-red-600' : ''}`}>{bicim(v)}</td>)}</tr>)}</tbody></table></div></div>);
  const tum = veri.flatMap((x) => x.degerler);
  const max = Math.max(...tum, 0) || 1, min = Math.min(...tum, 0);
  const aralik = max - min || 1;
  const W = 1000, H = yukseklik, ust = 8, alt = 22, ph = H - ust - alt;
  const gw = W / veri.length, ic = Math.min(gw * 0.72, 180), bw = Math.max(2, (ic - (seriler.length - 1) * 2) / seriler.length);
  const y0 = ust + (max / aralik) * ph;
  const s = secili !== null ? veri[secili] : null;
  return (
    <div>
      {lejant}
      <div className="relative" onMouseLeave={() => setSecili(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }} role="img">
          {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={0} x2={W} y1={y0 - f * (max / aralik) * ph} y2={y0 - f * (max / aralik) * ph} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
          <line x1={0} x2={W} y1={y0} y2={y0} stroke="currentColor" className="text-slate-300 dark:text-slate-600" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {veri.map((x, i) => (
            <g key={i} onMouseEnter={() => setSecili(i)}>
              <rect x={i * gw} y={0} width={gw} height={H} fill={secili === i ? 'currentColor' : 'transparent'} className="text-slate-100/60 dark:text-slate-800/40" />
              {x.degerler.map((v, j) => {
                const h = (Math.abs(v) / aralik) * ph; if (h <= 0) return null;
                const bx = i * gw + (gw - ic) / 2 + j * (bw + 2), r = Math.min(4, bw / 2, h);
                const d = v >= 0
                  ? `M${bx},${y0} V${y0 - h + r} Q${bx},${y0 - h} ${bx + r},${y0 - h} H${bx + bw - r} Q${bx + bw},${y0 - h} ${bx + bw},${y0 - h + r} V${y0} Z`
                  : `M${bx},${y0} V${y0 + h - r} Q${bx},${y0 + h} ${bx + r},${y0 + h} H${bx + bw - r} Q${bx + bw},${y0 + h} ${bx + bw},${y0 + h - r} V${y0} Z`;
                return <path key={j} d={d} fill={seriler[j].renk} opacity={secili === null || secili === i ? 1 : 0.5} />;
              })}
            </g>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex text-[10px] text-slate-500">
          {veri.map((x, i) => <div key={i} className="text-center" style={{ width: `${100 / veri.length}%` }}>{x.etiket}</div>)}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 text-[10px] text-slate-400">{bicim(max)}</div>
        {s && (
          <div className="pointer-events-none absolute top-2 z-10 min-w-[170px] rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{ left: `clamp(0px, calc(${((secili! + 0.5) / veri.length) * 100}% - 85px), calc(100% - 175px))` }}>
            <div className="mb-1 font-semibold">{s.alt ?? s.etiket}</div>
            {seriler.map((sr, j) => <div key={sr.ad} className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 opacity-80"><span className="h-2 w-2 rounded-sm" style={{ background: sr.renk }} />{sr.ad}</span><span className="font-medium">{bicim(s.degerler[j])}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tek çubukta pay dağılımı (ör. ürün kârı / hizmet kârı); segmentler arasında 2px boşluk, etiketler metinde */
export function PayCubugu({ parcalar, bicim }: { parcalar: { ad: string; deger: number; renk: string }[]; bicim: (v: number) => string }) {
  const pozitif = parcalar.filter((p) => p.deger > 0); const top = pozitif.reduce((t, p) => t + p.deger, 0);
  if (!top) return <div className="py-4 text-center text-sm text-slate-400">Veri yok</div>;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">{pozitif.map((p) => <div key={p.ad} title={`${p.ad}: ${bicim(p.deger)}`} style={{ width: `${(p.deger / top) * 100}%`, background: p.renk }} />)}</div>
      <div className="mt-3 space-y-1.5">{parcalar.map((p) => (
        <div key={p.ad} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.renk }} />{p.ad}</span>
          <span><b>{bicim(p.deger)}</b> <span className="text-xs text-slate-500">{p.deger > 0 ? `%${((p.deger / top) * 100).toFixed(0)}` : ''}</span></span>
        </div>))}</div>
    </div>
  );
}
