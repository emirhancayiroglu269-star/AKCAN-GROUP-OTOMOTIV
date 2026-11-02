import { useMemo, useState } from 'react';
import { CheckSquare, PackageCheck, Printer, Square } from 'lucide-react';
import { useStore } from '../lib/store';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { depoKisa } from '../lib/muadil';
import { sayi, tarihSaat } from '../lib/format';
import { yazdir } from './Yazdir';
import { Modal } from './ui';
import type { DB, Urun } from '../lib/types';

/** Hazırlık fişi: teklif / sipariş kalemlerini raftan toplamak için İÇ belge (stok kodu, raf, depo stokları). Müşteriye gönderilmez. */
export type HazirlikKalem = { urun_id: string; ad: string; marka?: string | null; adet: number };
export type HazirlikBilgi = { musteri?: string | null; arac?: string | null; no?: number | string | null; zaman?: string | null };

type Satir = HazirlikKalem & { u?: Urun; depolar: { ad: string; stok: number }[]; eksik: boolean };
function satirlar(db: DB, kalemler: HazirlikKalem[]): Satir[] {
  const id = new Map(db.urunler.map((u) => [String(u.id), u])); const harita = stokHaritasi(db); const dep = aktifDepolar(db);
  return kalemler.filter((k) => k.adet > 0).map((k) => {
    const u = id.get(String(k.urun_id));
    const depolar = dep.map((d) => ({ ad: depoKisa(d.ad), stok: (u && harita.get(u.id)?.get(d.id)) ?? 0 }));
    return { ...k, u, depolar, eksik: !u || u.stok < k.adet };
  }).sort((a, b) => String(a.u?.raf ?? 'zzz').localeCompare(String(b.u?.raf ?? 'zzz'), 'tr') || String(a.u?.kod ?? '').localeCompare(String(b.u?.kod ?? '')));
}

/** Yazdırılabilir hazırlık fişi (rafa göre sıralı, işaret kutulu) */
export function hazirlikYazdir(db: DB, kalemler: HazirlikKalem[], bilgi: HazirlikBilgi) {
  const l = satirlar(db, kalemler);
  yazdir(
    <div className="p-5 text-[12px]">
      <div className="mb-3 flex justify-between border-b-2 border-black pb-2">
        <div><b className="text-lg">HAZIRLIK FİŞİ</b><div className="text-[10px]">İç belge, müşteriye verilmez</div></div>
        <div className="text-right">{bilgi.no ? <div>Teklif No {bilgi.no}</div> : null}<div>{tarihSaat(bilgi.zaman ?? new Date().toISOString())}</div></div>
      </div>
      {(bilgi.musteri || bilgi.arac) && <div className="mb-3">{bilgi.musteri && <div>Müşteri: <b>{bilgi.musteri}</b></div>}{bilgi.arac && <div>Araç: {bilgi.arac}</div>}</div>}
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-black text-left"><th className="w-6 py-1">✓</th><th>Stok kodu</th><th>Ürün</th><th>Raf</th><th className="text-right">Adet</th><th className="text-right">Depo stokları</th></tr></thead>
        <tbody>{l.map((s, i) => (
          <tr key={i} className="border-b align-top">
            <td className="py-1.5"><span className="inline-block h-3.5 w-3.5 border border-black" /></td>
            <td className="font-mono font-bold">{s.u?.kod ?? '—'}</td>
            <td>{s.ad}{s.marka ? ` (${s.marka})` : ''}{s.eksik && <div className="text-[10px] font-bold">! STOK YETERSİZ ({sayi(s.u?.stok ?? 0)})</div>}</td>
            <td className="font-bold">{s.u?.raf ?? ''}</td>
            <td className="text-right text-base font-bold">{sayi(s.adet)}</td>
            <td className="text-right text-[11px]">{s.depolar.map((d) => `${d.ad} ${sayi(d.stok)}`).join(' · ')}</td>
          </tr>))}</tbody>
      </table>
      <div className="mt-2 text-right">Toplam {l.length} kalem · {sayi(l.reduce((t, s) => t + s.adet, 0))} adet</div>
      <div className="mt-8 flex justify-between text-[11px]"><span>Hazırlayan: ..................</span><span>Kontrol: ..................</span></div>
    </div>);
}

/** Ekranda hazırlık listesi: telefonla rafta işaretleyerek toplamak için */
export function HazirlikPanel({ acik, kapat, kalemler, bilgi }: { acik: boolean; kapat: () => void; kalemler: HazirlikKalem[]; bilgi: HazirlikBilgi }) {
  const { db } = useStore();
  const l = useMemo(() => satirlar(db, kalemler), [db, kalemler]);
  const [alindi, setAlindi] = useState<Set<number>>(new Set());
  const tamam = alindi.size === l.length && l.length > 0;
  return (
    <Modal acik={acik} kapat={kapat} baslik="Hazırlık fişi" genis="lg">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">{[bilgi.no && `Teklif ${bilgi.no}`, bilgi.musteri, bilgi.arac].filter(Boolean).join(' · ') || 'Rafa göre sıralı'}</span>
        <span className={`ml-auto rozet ${tamam ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{alindi.size}/{l.length} alındı</span>
        <button className="btn-ghost px-2 py-1 text-sm" onClick={() => hazirlikYazdir(db, kalemler, bilgi)}><Printer size={15} /> Yazdır</button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{l.map((s, i) => {
        const al = alindi.has(i);
        return (
          <button key={i} className={`flex w-full items-start gap-3 py-2.5 text-left ${al ? 'opacity-50' : ''}`} onClick={() => setAlindi((x) => { const y = new Set(x); if (y.has(i)) y.delete(i); else y.add(i); return y; })}>
            {al ? <CheckSquare size={22} className="mt-0.5 shrink-0 text-emerald-600" /> : <Square size={22} className="mt-0.5 shrink-0 text-slate-400" />}
            <div className="min-w-0 flex-1">
              <div className={`font-mono text-base font-bold ${al ? 'line-through' : ''}`}>{s.u?.kod ?? 'Kod yok'}</div>
              <div className="text-sm">{s.ad}{s.marka ? <span className="text-slate-500"> · {s.marka}</span> : ''}</div>
              <div className="text-xs text-slate-500">{s.depolar.map((d) => `${d.ad} ${sayi(d.stok)}`).join(' · ')}</div>
              {s.eksik && <div className="text-xs font-semibold text-red-600">Stok yetersiz: toplam {sayi(s.u?.stok ?? 0)}, istenen {sayi(s.adet)}</div>}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xl font-bold">{sayi(s.adet)}</div>
              {s.u?.raf && <div className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900">Raf {s.u.raf}</div>}
            </div>
          </button>);
      })}</div>
      {tamam && <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><PackageCheck size={18} /> Tüm ürünler alındı.</div>}
    </Modal>
  );
}
