import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, MessageCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { musteriAnalizi, type MusteriOzet, type Segment } from '../lib/analiz2';
import { ara, para, sayi, tarih, telLink } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, SayfaBaslik } from '../components/ui';
import { MusteriLink } from '../components/DetayKart';

const SEG: { s: Segment; renk: string; aciklama: string }[] = [
  { s: 'Sadık', renk: 'bg-emerald-100 text-emerald-800', aciklama: '6+ farklı gün alışveriş, düzenli geliyor' },
  { s: 'Düzenli', renk: 'bg-sky-100 text-sky-800', aciklama: 'Tekrar gelen, ritmi bozulmamış' },
  { s: 'Yeni', renk: 'bg-violet-100 text-violet-800', aciklama: 'İlk alışı son 30 gün' },
  { s: 'Riskte', renk: 'bg-amber-100 text-amber-800', aciklama: 'Her zamanki aralığının 2,5 katıdır gelmiyor' },
  { s: 'Kaybedilen', renk: 'bg-red-100 text-red-700', aciklama: '90 günden uzun süredir gelmiyor' },
  { s: 'Tek seferlik', renk: 'bg-slate-100 text-slate-600', aciklama: 'Bir kez gelip dönmedi' },
];
type Sutun = 'ad' | 'ciro' | 'kar' | 'belge' | 'ortSepet' | 'son' | 'sonGecen';

export default function MusteriAnalizi() {
  const { db } = useStore();
  const [d, setD] = useDonem('Tüm veri');
  const [seg, setSeg] = useState<Segment | ''>('');
  const [q, setQ] = useState('');
  const [sira, setSira] = useState<{ s: Sutun; az: boolean }>({ s: 'ciro', az: true });
  const hepsi = useMemo(() => musteriAnalizi(db, d), [db, d]);
  const kayitli = hepsi.filter((m) => m.segment !== 'Perakende');
  const perakende = hepsi.filter((m) => m.segment === 'Perakende').reduce((t, m) => t + m.ciro, 0);
  const toplam = hepsi.reduce((t, m) => t + m.ciro, 0) || 1;
  const liste = kayitli.filter((m) => (!seg || m.segment === seg) && ara(q, m.ad, m.telefon))
    .sort((a, b) => { const v = (x: MusteriOzet) => (sira.s === 'ad' ? x.ad : x[sira.s] ?? 0); const p = v(a), r = v(b); const c = typeof p === 'string' ? p.localeCompare(r as string, 'tr') : (p as number) - (r as number); return sira.az ? -c : c; });
  const ilk20 = [...kayitli].sort((a, b) => b.ciro - a.ciro).slice(0, Math.max(1, Math.ceil(kayitli.length * 0.2))).reduce((t, m) => t + m.ciro, 0);
  const bas = (s: Sutun, ad: string, sag = true) => <th key={s} className={`cursor-pointer select-none whitespace-nowrap ${sag ? 'text-right' : ''}`} onClick={() => setSira((x) => ({ s, az: x.s === s ? !x.az : s !== 'ad' }))}>{ad}{sira.s === s && (sira.az ? <ArrowDown size={11} className="ml-0.5 inline" /> : <ArrowUp size={11} className="ml-0.5 inline" />)}</th>;
  const mesaj = (m: MusteriOzet) => `Merhaba ${m.ad.split('/')[0].trim()}, ${db.ayarlar.firma_adi} olarak sizi özledik. Aracınızın bakım ve parça ihtiyaçları için bekleriz. ${db.ayarlar.telefon ?? ''}`;
  const csv = () => {
    const s = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Müşteri', 'Telefon', 'Segment', 'Satış', 'Brüt kâr', 'Fiş', 'Ortalama sepet', 'İlk alış', 'Son alış', 'Gelmediği gün', 'Ortalama aralık (gün)', 'Bakiye']),
      ...liste.map((m) => s([m.ad, m.telefon, m.segment, m.ciro.toFixed(2), m.kar.toFixed(2), m.belge, m.ortSepet.toFixed(2), m.ilk, m.son, m.sonGecen, m.ortAralik?.toFixed(0), m.bakiye]))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); a.download = 'musteri-analizi.csv'; a.click();
  };

  return (
    <div>
      <SayfaBaslik baslik="Müşteri Analizi" alt="Kim ne kadar alıyor, kim gelmeyi bıraktı">
        <button className="btn-ghost" onClick={csv}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SEG.map((x) => {
          const l = kayitli.filter((m) => m.segment === x.s);
          return (
            <button key={x.s} onClick={() => setSeg(seg === x.s ? '' : x.s)} className={`card p-3 text-left transition ${seg === x.s ? 'ring-2 ring-marka-500' : ''}`} title={x.aciklama}>
              <span className={`rozet ${x.renk}`}>{x.s}</span>
              <div className="mt-1.5 text-xl font-bold">{sayi(l.length)}</div>
              <div className="text-xs text-slate-500">{para(l.reduce((t, m) => t + m.ciro, 0))}</div>
            </button>
          );
        })}
      </div>
      <div className="mb-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Kayıtlı {sayi(kayitli.length)} müşteri. Satışın %{((perakende / toplam) * 100).toFixed(0)}'i perakende cariye ({para(perakende)}). Kayıtlı müşterilerin en iyi %20'si, kayıtlı müşteri satışının %{((ilk20 / (toplam - perakende || 1)) * 100).toFixed(0)}'ini getiriyor. Riskteki ve kaybedilen müşterilere WhatsApp ile hatırlatma gönderebilirsiniz.
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Müşteri adı, plaka, telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
          {seg && <button className="btn-ghost text-xs" onClick={() => setSeg('')}>Filtreyi kaldır ({seg})</button>}
          <span className="ml-auto text-xs text-slate-500">{sayi(liste.length)} müşteri</span>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Müşteri yok." /> : (
            <table className="tbl">
              <thead><tr>{bas('ad', 'Müşteri', false)}<th>Segment</th>{bas('ciro', 'Satış')}{bas('kar', 'Brüt kâr')}{bas('belge', 'Fiş')}{bas('ortSepet', 'Ort. sepet')}{bas('son', 'Son alış')}{bas('sonGecen', 'Gelmediği')}<th className="text-right">Bakiye</th><th className="w-10" /></tr></thead>
              <tbody>{liste.slice(0, 500).map((m) => {
                const tel = telLink(m.telefon); const r = SEG.find((x) => x.s === m.segment);
                return (
                  <tr key={m.guid}>
                    <td><div className="font-medium"><MusteriLink guid={m.guid} ad={m.ad} /></div><div className="text-xs text-slate-500">{m.telefon}{m.ortAralik ? ` · ort. ${Math.round(m.ortAralik)} günde bir` : ''}</div></td>
                    <td><span className={`rozet ${r?.renk}`}>{m.segment}</span></td>
                    <td className="text-right font-medium">{para(m.ciro)}</td><td className="text-right text-emerald-700">{para(m.kar)}</td>
                    <td className="text-right">{m.belge}</td><td className="text-right text-slate-500">{para(m.ortSepet)}</td>
                    <td className="text-slate-500">{tarih(m.son + 'T12:00')}</td>
                    <td className={`text-right ${m.sonGecen > 90 ? 'text-red-600' : m.sonGecen > 45 ? 'text-amber-600' : 'text-slate-500'}`}>{m.sonGecen} gün</td>
                    <td className={`text-right ${m.bakiye && m.bakiye > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{m.bakiye ? para(m.bakiye) : '—'}</td>
                    <td>{tel && (m.segment === 'Riskte' || m.segment === 'Kaybedilen') && <a className="text-slate-400 hover:text-emerald-600" title="WhatsApp ile hatırlat" target="_blank" rel="noreferrer" href={`https://wa.me/${tel}?text=${encodeURIComponent(mesaj(m))}`}><MessageCircle size={16} /></a>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
