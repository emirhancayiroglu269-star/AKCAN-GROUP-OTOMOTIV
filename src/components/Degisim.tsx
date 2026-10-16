/** Önceki döneme göre yüzde değişim rozeti */
export function Degisim({ simdi, once, ters, etiket = 'önceki döneme göre' }: { simdi: number; once: number; ters?: boolean; etiket?: string }) {
  if (!once) return <span className="text-xs text-slate-400">önceki dönem yok</span>;
  const y = ((simdi - once) / Math.abs(once)) * 100;
  const iyi = ters ? y < 0 : y > 0;
  return <span className={`text-xs font-semibold ${Math.abs(y) < 0.5 ? 'text-slate-500' : iyi ? 'text-emerald-600' : 'text-red-600'}`}>{y > 0 ? '▲' : y < 0 ? '▼' : '•'} %{Math.abs(y).toFixed(1)} <span className="font-normal text-slate-400">{etiket}</span></span>;
}
