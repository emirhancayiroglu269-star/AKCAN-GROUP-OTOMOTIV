import { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { devirHizi, sonAlislar, sonSatislar } from '../lib/analiz2';
import { ilkSatisGunu, netAlis } from '../lib/analiz';
import { ara, gunu, para, sayi, tarih } from '../lib/format';
import type { Urun } from '../lib/types';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, SayfaBaslik } from '../components/ui';

const KOVA = [
  { ad: '0–30 gün', min: 0, max: 30, renk: 'bg-emerald-500' }, { ad: '31–60 gün', min: 31, max: 60, renk: 'bg-lime-500' },
  { ad: '61–90 gün', min: 61, max: 90, renk: 'bg-amber-500' }, { ad: '91–180 gün', min: 91, max: 180, renk: 'bg-orange-500' },
  { ad: '180+ gün', min: 181, max: 99999, renk: 'bg-red-500' }, { ad: 'Hiç satılmadı (90+ gündür stokta)', min: -1, max: -1, renk: 'bg-red-700' },
];

export default function StokSagligi() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const [kova, setKova] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');
  const son = useMemo(() => sonSatislar(db), [db]);
  const alis = useMemo(() => sonAlislar(db), [db]);
  const bugun = gunu();
  const ilk = ilkSatisGunu(db);
  const gecen = (g: string) => Math.round((new Date(bugun + 'T12:00').getTime() - new Date(g + 'T12:00').getTime()) / 864e5);
  const satirlar = useMemo(() => db.urunler.filter((u) => u.aktif && u.stok > 0).map((u) => {
    const s = son.get(u.id); const al = alis.get(u.id)?.tarih;
    // hiç satılmamış ürünün yaşı: satış verisinin başladığı gün ile son alış gününün geç olanından beri (yeni alınan mal ölü sayılmaz)
    const bas = !s ? [ilk, al].filter(Boolean).sort().pop() : undefined;
    const gun = s ? gecen(s) : bas ? gecen(bas) : 9999;
    const deger = u.stok * (u.alis_fiyati > 0 ? netAlis(u.alis_fiyati, u.kdv, db.ayarlar) : 0);
    const k = !s && gun > 90 ? 5 : KOVA.findIndex((x) => gun >= x.min && gun <= x.max);
    return { u, son: s, alisTarih: al, gun, deger, kova: k };
  }), [db, son, alis, bugun, ilk]);
  const kovaOzet = KOVA.map((x, i) => { const l = satirlar.filter((r) => r.kova === i); return { ...x, adet: l.length, deger: l.reduce((t, r) => t + r.deger, 0) }; });
  const topDeger = kovaOzet.reduce((t, k) => t + k.deger, 0) || 1;
  const kategoriler = useMemo(() => Array.from(new Set(db.urunler.map((u) => u.kategori).filter(Boolean))).sort() as string[], [db.urunler]);
  const liste = satirlar.filter((r) => (kova === null ? r.kova >= 3 : r.kova === kova) && (!kat || r.u.kategori === kat) && ara(q, r.u.ad, r.u.kod, r.u.marka)).sort((a, b) => b.deger - a.deger);
  const devir = useMemo(() => devirHizi(db, d).filter((x) => x.stok > 0).sort((a, b) => a.yillikDevir - b.yillikDevir), [db, d]);
  const csv = () => {
    const s = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Stok kodu', 'Ürün', 'Marka', 'Kategori', 'Stok', 'Son satış', 'Gün', 'Stok değeri (maliyet)', 'Satış fiyatı']), ...liste.map((r: { u: Urun; son?: string; gun: number; deger: number }) => s([r.u.kod, r.u.ad, r.u.marka, r.u.kategori, r.u.stok, r.son ?? 'hiç', r.gun >= 9999 ? '' : r.gun, r.deger.toFixed(2), r.u.satis_fiyati]))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); a.download = 'olu-stok.csv'; a.click();
  };

  return (
    <div>
      <SayfaBaslik baslik="Stok Sağlığı" alt="Ölü stok, stok yaşlanması ve kategori bazında stok devir hızı">
        <button className="btn-ghost" onClick={csv}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="card mb-4 p-4">
        <h3 className="mb-1 font-semibold">Stok yaşlanması — son satıştan bu yana geçen süre</h3>
        <p className="mb-3 text-xs text-slate-500">Stoktaki ürünlerin maliyet değerine göre. {ilk ? `Satış verisi ${tarih(ilk + 'T12:00')} tarihinden beri var. Hiç satılmamış ürünlerin yaşı bu tarihten ya da son alış tarihinden (hangisi yeniyse) sayılır; yeni alınan mal ölü stok sayılmaz.` : ''}</p>
        <div className="mb-3 flex h-4 overflow-hidden rounded-full">{kovaOzet.map((k, i) => <div key={i} className={k.renk} style={{ width: `${(k.deger / topDeger) * 100}%` }} title={`${k.ad}: ${para(k.deger)}`} />)}</div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {kovaOzet.map((k, i) => (
            <button key={i} onClick={() => setKova(kova === i ? null : i)} className={`rounded-lg border p-2 text-left text-sm transition ${kova === i ? 'border-marka-500 ring-1 ring-marka-500' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className={`h-2 w-2 rounded-full ${k.renk}`} />{k.ad}</div>
              <div className="font-bold">{para(k.deger)}</div><div className="text-xs text-slate-500">{sayi(k.adet)} ürün · %{((k.deger / topDeger) * 100).toFixed(0)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <b className="text-sm">{kova === null ? 'Ölü stok (90 günden uzun satılmayan)' : KOVA[kova].ad}</b>
            <input className="inp ml-auto max-w-[200px]" placeholder="Ara…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="inp w-40" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k}>{k}</option>)}</select>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {liste.length === 0 ? <Bos metin="Bu grupta ürün yok." /> : (
              <table className="tbl"><thead><tr><th>Ürün</th><th className="text-right">Stok</th><th>Son satış</th><th className="text-right">Bağlı para</th><th className="text-right">Satış fiyatı</th></tr></thead>
                <tbody>{liste.slice(0, 400).map((r) => (
                  <tr key={r.u.id}><td><div className="font-medium">{r.u.ad}</div><div className="text-xs text-slate-500">{[r.u.kod, r.u.marka, r.u.kategori].filter(Boolean).join(' · ')}</div></td>
                    <td className="text-right">{sayi(r.u.stok)}</td><td className="text-slate-500">{r.son ? `${tarih(r.son + 'T12:00')} (${r.gun} gün)` : <>hiç satılmadı{r.alisTarih ? <div className="text-[11px]">son alış {tarih(r.alisTarih + 'T12:00')}</div> : null}</>}</td>
                    <td className="text-right font-semibold">{para(r.deger)}</td><td className="text-right text-slate-500">{para(r.u.satis_fiyati)}</td></tr>
                ))}</tbody></table>
            )}
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Stok devir hızı</h3></div>
          <div className="mb-2"><DonemSecici d={d} sec={setD} /></div>
          <p className="mb-2 text-xs text-slate-500">Yıllık devir = satılan malın maliyeti ÷ stok değeri (yıllığa çevrilmiş). Düşük devir: para rafta yatıyor.</p>
          <div className="max-h-[50vh] overflow-auto"><table className="tbl"><thead><tr><th>Kategori</th><th className="text-right">Stok</th><th className="text-right">Devir</th><th className="text-right">Stok günü</th></tr></thead>
            <tbody>{devir.slice(0, 200).map((x) => <tr key={x.ad}><td className="max-w-[140px] truncate" title={x.ad}>{x.ad}</td><td className="text-right text-slate-500">{para(x.stok)}</td>
              <td className={`text-right font-medium ${x.yillikDevir < 1 ? 'text-red-600' : x.yillikDevir < 3 ? 'text-amber-600' : 'text-emerald-700'}`}>{x.yillikDevir.toFixed(1)}×</td>
              <td className="text-right text-slate-500">{Number.isFinite(x.stokGunu) ? Math.round(x.stokGunu) : '∞'}</td></tr>)}</tbody></table></div>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Ölü stok listesi kampanya, paket satış, fiyat indirimi veya (alışı 150 günü geçmemişse) tedarikçiye iade adaylarıdır; "Eritme planı" sekmesi her ürün için öneri verir. Bu ürünleri tekrar sipariş etmeden önce bakın.</span>
      </div>
    </div>
  );
}
