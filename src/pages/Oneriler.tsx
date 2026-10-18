import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Eye, Lightbulb, RotateCcw, TrendingUp, Wallet } from 'lucide-react';
import type { Sayfa } from '../App';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import type { Urun } from '../lib/types';
import { para } from '../lib/format';
import { onerileriCikar, type Alan, type Oneri } from '../lib/oneriler';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

const ONCELIK = { 1: { ad: 'Önemli', cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' }, 2: { ad: 'Orta', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' }, 3: { ad: 'Düşük', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' } } as const;
const ANAHTAR = 'oneri-yapildi';
const okuYapildi = (): string[] => { try { return JSON.parse(localStorage.getItem(ANAHTAR) ?? '[]'); } catch { return []; } };

export default function Oneriler({ git }: { git: (s: Sayfa) => void }) {
  const { db, calistir, yenile } = useStore();
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const kritikKaydet = async (liste: { id: string; kritik: number }[]) => {
    setKaydediliyor(true);
    await calistir(async () => {
      for (let i = 0; i < liste.length; i += 10) await Promise.all(liste.slice(i, i + 10).map((x) => backend.update<Urun>('urunler', x.id, { kritik_stok: x.kritik })));
      await yenile();
    }, `${liste.length} ürüne kritik stok kaydedildi`);
    setKaydediliyor(false);
  };
  const tum = useMemo(() => onerileriCikar(db), [db]);
  const [alan, setAlan] = useState<Alan | ''>('');
  const [acik, setAcik] = useState<string | null>(null);
  const [yapildi, setYapildi] = useState<string[]>(okuYapildi);
  const [gizliGoster, setGizliGoster] = useState(false);
  const isaretle = (id: string) => {
    const y = yapildi.includes(id) ? yapildi.filter((x) => x !== id) : [...yapildi, id];
    setYapildi(y); try { localStorage.setItem(ANAHTAR, JSON.stringify(y)); } catch { /* yok */ }
  };
  const gorunen = tum.filter((x) => gizliGoster || !yapildi.includes(x.id));
  const liste = gorunen.filter((x) => !alan || x.alan === alan);
  const alanlar = Array.from(new Set(tum.map((x) => x.alan)));
  const karFirsat = gorunen.filter((x) => x.etkiTur === 'kar').reduce((t, x) => t + (x.etki ?? 0), 0);
  const nakit = gorunen.filter((x) => x.etkiTur === 'nakit').reduce((t, x) => t + (x.etki ?? 0), 0);
  const onemli = gorunen.filter((x) => x.oncelik === 1).length;
  const gizliSay = tum.filter((x) => yapildi.includes(x.id)).length;

  const kart = (x: Oneri) => {
    const ac = acik === x.id; const bitti = yapildi.includes(x.id);
    return (
      <div key={x.id} className={`card overflow-hidden ${bitti ? 'opacity-60' : ''}`}>
        <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setAcik(ac ? null : x.id)}>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${ONCELIK[x.oncelik].cls}`}>{ONCELIK[x.oncelik].ad}</span>
              <span className="text-slate-500">{x.alan}</span>
            </div>
            <div className="font-semibold">{x.baslik}</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{x.aciklama}</p>
          </div>
          {x.etki ? (
            <div className="shrink-0 text-right">
              <div className={`text-base font-bold ${x.etkiTur === 'kar' ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>{para(x.etki)}</div>
              <div className="text-[11px] text-slate-500">{x.etkiTur === 'kar' ? 'aylık kâr fırsatı' : 'nakde dönebilir'}</div>
            </div>
          ) : null}
          <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition ${ac ? 'rotate-180' : ''}`} />
        </button>
        {ac && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 text-sm font-semibold">Ne yapmalı?</div>
            <ul className="mb-4 space-y-1.5 text-sm">{x.adimlar.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marka-500" />{s}</li>)}</ul>
            {x.tablo && x.tablo.satirlar.length > 0 && (
              <div className="mb-4 max-h-[50vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="tbl"><thead><tr>{x.tablo.basliklar.map((b, i) => <th key={i} className={x.tablo!.sag?.includes(i) ? 'text-right' : ''}>{b}</th>)}{x.tablo.bh && <th />}</tr></thead>
                  <tbody>{x.tablo.satirlar.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={x.tablo!.sag?.includes(j) ? 'whitespace-nowrap text-right' : ''}>{c}</td>)}{x.tablo!.bh && <td className="whitespace-nowrap text-right">{x.tablo!.bh[i] ? <a href={x.tablo!.bh[i]!} target="_blank" rel="noopener noreferrer" className="text-marka-600 hover:underline">BizimHesap'ta aç ↗</a> : null}</td>}</tr>)}</tbody></table>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {x.kritikUygula && x.kritikUygula.length > 0 && (
                <button className="btn-primary" disabled={kaydediliyor} onClick={() => kritikKaydet(x.kritikUygula!)}>
                  <Check size={15} /> {kaydediliyor ? 'Kaydediliyor…' : `Önerilen kritik stokları kaydet (${x.kritikUygula.length} ürün)`}
                </button>
              )}
              {x.sayfa && <button className="btn-ghost" onClick={() => git(x.sayfa!)}>İlgili sayfaya git <ArrowRight size={15} /></button>}
              <button className="btn-ghost" onClick={() => isaretle(x.id)}>{bitti ? <><RotateCcw size={15} /> Tekrar göster</> : <><Check size={15} /> Yapıldı, gizle</>}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl">
      <SayfaBaslik baslik="Öneriler" alt="Son 90 günün satış, alış, stok, cari ve kasa verilerinden otomatik çıkarılır; veriler güncellendikçe değişir">
        {gizliSay > 0 && <button className="btn-ghost" onClick={() => setGizliGoster(!gizliGoster)}><Eye size={16} /> {gizliGoster ? 'Yapılanları gizle' : `Yapılanları göster (${gizliSay})`}</button>}
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Öneri" deger={gorunen.length} alt={`${onemli} tanesi önemli`} ikon={<Lightbulb size={16} />} renk="amber" />
        <Kpi etiket="Aylık kâr fırsatı (tahmini)" deger={para(karFirsat)} alt="Önerilerin hepsi uygulanırsa" ikon={<TrendingUp size={16} />} renk="green" />
        <Kpi etiket="Nakde dönebilecek para" deger={para(nakit)} alt="Ölü/fazla stok + alacaklar" ikon={<Wallet size={16} />} renk="blue" />
        <Kpi etiket="Veri dönemi" deger="Son 90 gün" alt="Karşılaştırmalar önceki 90 günle" />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button onClick={() => setAlan('')} className={`rounded-full px-3 py-1 text-xs ${!alan ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>Hepsi ({gorunen.length})</button>
        {alanlar.map((x) => <button key={x} onClick={() => setAlan(x)} className={`rounded-full px-3 py-1 text-xs ${alan === x ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{x} ({gorunen.filter((y) => y.alan === x).length})</button>)}
      </div>
      {liste.length === 0 ? <div className="card"><Bos metin={tum.length ? 'Bu grupta açık öneri yok.' : 'Şu an öneri yok — veriler biriktikçe burada görünecek.'} /></div> : <div className="space-y-3">{liste.map(kart)}</div>}
      <p className="mt-4 text-xs text-slate-500">Tutarlar tahmindir: son 90 günün satış hızı aynı kalırsa ne kadar fark edeceğini gösterir. Kâr tutarları KDV hariçtir. "Yapıldı" işareti sadece bu tarayıcıda saklanır.</p>
    </div>
  );
}
