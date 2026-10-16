import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({ acik, kapat, baslik, children, genis, alt }: {
  acik: boolean; kapat: () => void; baslik: string; children: ReactNode; genis?: 'md' | 'lg' | 'xl'; alt?: ReactNode;
}) {
  useEffect(() => {
    if (!acik) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && kapat();
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [acik, kapat]);
  if (!acik) return null;
  const w = genis === 'xl' ? 'max-w-5xl' : genis === 'lg' ? 'max-w-3xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 pt-[6vh] print:hidden" onMouseDown={kapat}>
      <div className={`card w-full ${w} flex max-h-[88vh] flex-col`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h3 className="font-semibold">{baslik}</h3>
          <button onClick={kapat} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Kapat"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {alt && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">{alt}</div>}
      </div>
    </div>
  );
}

export function Alan({ etiket, children, className = '' }: { etiket: string; children: ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="lbl">{etiket}</span>{children}</label>;
}

export function SayfaBaslik({ baslik, alt, children }: { baslik: string; alt?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{baslik}</h1>
        {alt && <p className="text-sm text-slate-500">{alt}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Kpi({ etiket, deger, alt, renk = 'slate', ikon }: { etiket: string; deger: ReactNode; alt?: ReactNode; renk?: 'slate' | 'green' | 'red' | 'amber' | 'blue'; ikon?: ReactNode }) {
  const r = { slate: 'text-slate-600 bg-slate-100', green: 'text-emerald-700 bg-emerald-50', red: 'text-red-700 bg-red-50', amber: 'text-amber-700 bg-amber-50', blue: 'text-sky-700 bg-sky-50' }[renk];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{etiket}</span>
        {ikon && <span className={`rounded-lg p-1.5 ${r} dark:bg-slate-800`}>{ikon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{deger}</div>
      {alt && <div className="mt-1 text-xs text-slate-500">{alt}</div>}
    </div>
  );
}

export function Bos({ metin }: { metin: string }) {
  return <div className="py-10 text-center text-sm text-slate-400">{metin}</div>;
}

export function onayla(metin: string) { return window.confirm(metin); }
