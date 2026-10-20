import { useMemo, useState } from 'react';
import { Download, ExternalLink, Info } from 'lucide-react';
import { UrunLink } from '../components/DetayKart';
import { useStore } from '../lib/store';
import { kartEksigi, urunOzetleri } from '../lib/analiz';
import { ara, gunu, para, sayi, tarih } from '../lib/format';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

type Filtre = 'satilan' | 'stokta' | 'maliyet' | 'kategori' | 'hepsi';
const BH = (guid: string) => `https://uygulama.bizimhesap.com/web/ngn/prd/ngnproduct?rc=1&guid=${guid}`;

/** BizimHesap kartında alış fiyatı veya kategorisi eksik parçalar: kâr hesabını bozanlar önce */
export default function EksikBilgi() {
  const { db } = useStore();
  const [filtre, setFiltre] = useState<Filtre>('satilan');
  const [q, setQ] = useState('');
  const d = useMemo(() => ({ bas: gunu(new Date(Date.now() - 89 * 864e5)), bit: gunu() }), []);
  const satirlar = useMemo(() => {
    const oz = urunOzetleri(db, d);
    const l = [];
    for (const u of db.urunler) {
      const e = kartEksigi(u); if (!e) continue;
      const o = oz.get(u.id);
      l.push({ u, e, satis: o?.ciroNet ?? 0, adet: o?.satilan ?? 0, son: o?.sonSatis });
    }
    return l.sort((x, y) => y.satis - x.satis || y.u.stok - x.u.stok || x.u.ad.localeCompare(y.u.ad, 'tr'));
  }, [db, d]);
  const uy = (f: Filtre, r: (typeof satirlar)[number]) => f === 'satilan' ? r.satis > 0 : f === 'stokta' ? r.u.stok > 0 : f === 'maliyet' ? r.e.maliyet : f === 'kategori' ? r.e.kategori : true;
  const liste = satirlar.filter((r) => uy(filtre, r) && ara(q, r.u.ad, r.u.kod, r.u.marka, r.u.kategori));
  const say = (f: Filtre) => satirlar.filter((r) => uy(f, r)).length;
  const kayipSatis = satirlar.filter((r) => r.e.maliyet).reduce((t, r) => t + r.satis, 0);
  const stokta = satirlar.filter((r) => r.u.stok > 0 && r.e.maliyet).length;

  const csv = () => {
    const s = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Stok kodu', 'Ürün', 'Marka', 'Kategori', 'Eksik', 'Stok', 'Son 90 gün satış (KDV hariç)', 'Adet', 'Son satış', 'BizimHesap']),
      ...liste.map((r) => s([r.u.kod, r.u.ad, r.u.marka, r.u.kategori, [r.e.maliyet && 'Alış fiyatı', r.e.kategori && 'Kategori'].filter(Boolean).join(' + '), r.u.stok, r.satis.toFixed(2), r.adet, r.son ? tarih(r.son) : '', r.u.bh_id ? BH(r.u.bh_id) : '']))].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = 'eksik-kart-bilgisi.csv'; el.click();
  };
  const fBtn = (f: Filtre, ad: string) => <button key={f} onClick={() => setFiltre(f)} className={`rounded-full px-3 py-1.5 text-sm ${filtre === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad} <span className="opacity-60">{say(f)}</span></button>;

  return (
    <div>
      <SayfaBaslik baslik="Eksik kart bilgisi" alt="BizimHesap'ta alış fiyatı veya kategorisi girilmemiş parçalar. Bunlar düzeltilmeden kâr eksik görünür.">
        <button className="btn-ghost" onClick={csv}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Eksik bilgili parça" deger={sayi(satirlar.length)} alt={`${say('maliyet')} alış fiyatı · ${say('kategori')} kategori`} renk={satirlar.length ? 'amber' : 'green'} />
        <Kpi etiket="Kâra katılmayan satış" deger={para(kayipSatis)} alt="Son 90 gün · alış fiyatı olmadığı için (KDV hariç)" renk={kayipSatis ? 'red' : 'green'} />
        <Kpi etiket="Son 90 günde satılan" deger={sayi(say('satilan'))} alt="Önce bunları düzeltin" renk="amber" />
        <Kpi etiket="Stokta, alış fiyatı yok" deger={sayi(stokta)} alt="Stok maliyetine katılmıyor" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {fBtn('satilan', 'Son 90 günde satılan')}{fBtn('stokta', 'Stokta olan')}{fBtn('maliyet', 'Alış fiyatı yok')}{fBtn('kategori', 'Kategorisi yok')}{fBtn('hepsi', 'Tümü')}
        <input className="inp ml-auto max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card">
        <div className="max-h-[62vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Bu filtrede eksik bilgili parça yok 👍" /> : (
            <table className="tbl">
              <thead><tr><th>Ürün</th><th>Eksik</th><th className="text-right">Stok</th><th className="text-right">Satış (90 gün)</th><th className="text-right">Adet</th><th className="text-right">Son satış</th><th></th></tr></thead>
              <tbody>{liste.slice(0, 500).map((r) => (
                <tr key={r.u.id}>
                  <td><div className="font-medium"><UrunLink id={String(r.u.id)}>{r.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[r.u.kod, r.u.marka, r.u.kategori].filter(Boolean).join(' · ')}</div></td>
                  <td><div className="flex flex-wrap gap-1">{r.e.maliyet && <span className="rozet bg-red-50 text-red-700">Alış fiyatı</span>}{r.e.kategori && <span className="rozet bg-amber-50 text-amber-700">Kategori</span>}</div></td>
                  <td className="text-right">{sayi(r.u.stok)}</td>
                  <td className="text-right font-medium">{r.satis ? para(r.satis) : '—'}</td>
                  <td className="text-right">{r.adet ? sayi(r.adet) : '—'}</td>
                  <td className="text-right text-slate-500">{r.son ? tarih(r.son) : '—'}</td>
                  <td className="text-right">{r.u.bh_id && <a className="inline-flex items-center gap-1 text-xs text-marka-600 hover:underline" href={BH(r.u.bh_id)} target="_blank" rel="noreferrer">BizimHesap'ta aç <ExternalLink size={12} /></a>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>İşçilik/hizmet kalemleri (adında işçilik, ücret, tamir, değişim, torna, yıkama vb. geçenler) ve araç alım/satımı listelenmez. Alış fiyatı girilince geçmiş satışların kârı da hesaplanır. Kategori girilince ürün analizlerine ve stok listelerine dahil olur. BizimHesap'ta düzelttiğiniz kart birkaç dakika içinde listeden düşer.</span>
      </div>
    </div>
  );
}
