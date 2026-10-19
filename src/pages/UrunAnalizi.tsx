import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { abcSinifla, alinacakHesap, birimKar, ilkSatisGunu, stokluMu, takipGunu, urunOzetleri, type AbcSinif } from '../lib/analiz';
import { ara, para, sayi, tarih } from '../lib/format';
import type { Urun } from '../lib/types';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, SayfaBaslik } from '../components/ui';
import { UrunLink } from '../components/DetayKart';

type Temel = 'ciro' | 'kar' | 'adet' | 'stok';
type Sutun = 'ad' | 'stok' | 'satilan' | 'ciro' | 'kar' | 'marj' | 'birimKar' | 'hiz' | 'yeter' | 'alinacak' | 'stokDeger';
const TEMEL_AD: Record<Temel, string> = { ciro: 'Satış tutarına göre', kar: 'Brüt kâra göre', adet: 'Satılan adede göre', stok: 'Stok değerine göre (maliyet)' };
const ABC_RENK: Record<AbcSinif, string> = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-amber-100 text-amber-800', C: 'bg-slate-100 text-slate-600' };

interface Satir { u: Urun; satilan: number; ciro: number; kar: number; marj: number; birimKar: number; maliyetYok: boolean; hiz: number; yeter: number; alinacak: number; stokDeger: number; sonSatis?: string; abc: AbcSinif }

export default function UrunAnalizi() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const [temel, setTemel] = useState<Temel>('ciro');
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');
  const [marka, setMarka] = useState('');
  const [sinif, setSinif] = useState<'' | AbcSinif>('');
  const [kapsam, setKapsam] = useState<'satilan' | 'stoklu' | 'hepsi'>('satilan');
  const [sira, setSira] = useState<{ s: Sutun; azalan: boolean }>({ s: 'ciro', azalan: true });
  const [goster, setGoster] = useState(200);
  const a = db.ayarlar;
  const gun = takipGunu(db, d);
  const hedefGun = a.hedef_gun || 30;

  const oz = useMemo(() => urunOzetleri(db, d), [db, d]);
  // işçilik/hizmet, araç alım-satım ve kategorisiz kalemler stoklu ürün değil: ABC'ye ve "alınacak"a katılmaz
  const disarida = useMemo(() => db.urunler.filter((u) => !stokluMu(u)).map((u) => oz.get(u.id)).filter((x) => x && x.ciro > 0).reduce((t, x) => ({ adet: t.adet + 1, ciro: t.ciro + x!.ciro }), { adet: 0, ciro: 0 }), [db.urunler, oz]);
  const satirlar = useMemo<Satir[]>(() => {
    const ham = db.urunler.filter((u) => u.aktif && stokluMu(u)).map((u) => {
      const o = oz.get(u.id); const bk = birimKar(u, a);
      const al = alinacakHesap(u, o?.satilan ?? 0, gun, hedefGun);
      return { u, satilan: o?.satilan ?? 0, ciro: o?.ciro ?? 0, kar: o?.kar ?? 0, marj: bk.marj, birimKar: bk.kar, maliyetYok: bk.maliyetYok,
        hiz: al.hiz, yeter: al.yeterGun, alinacak: al.alinacak, stokDeger: Math.max(0, u.stok) * (u.alis_fiyati || 0), sonSatis: o?.sonSatis, abc: 'C' as AbcSinif };
    });
    const deger = (x: Satir) => (temel === 'ciro' ? x.ciro : temel === 'kar' ? x.kar : temel === 'adet' ? x.satilan : x.stokDeger);
    const abc = abcSinifla(ham, deger);
    ham.forEach((x) => (x.abc = abc.get(x)!));
    return ham;
  }, [db, oz, a, gun, hedefGun, temel]);

  const ozet = useMemo(() => {
    const deger = (x: Satir) => (temel === 'ciro' ? x.ciro : temel === 'kar' ? x.kar : temel === 'adet' ? x.satilan : x.stokDeger);
    const toplam = satirlar.reduce((t, x) => t + Math.max(0, deger(x)), 0) || 1;
    return (['A', 'B', 'C'] as AbcSinif[]).map((s) => {
      const l = satirlar.filter((x) => x.abc === s && deger(x) > 0);
      return { s, adet: l.length, pay: (l.reduce((t, x) => t + deger(x), 0) / toplam) * 100, stok: l.reduce((t, x) => t + x.stokDeger, 0) };
    });
  }, [satirlar, temel]);
  const olu = satirlar.filter((x) => x.u.stok > 0 && x.satilan === 0);
  const oluDeger = olu.reduce((t, x) => t + x.stokDeger, 0);

  const kategoriler = useMemo(() => Array.from(new Set(db.urunler.map((u) => u.kategori).filter(Boolean))).sort() as string[], [db.urunler]);
  const markalar = useMemo(() => Array.from(new Set(db.urunler.map((u) => u.marka).filter(Boolean))).sort() as string[], [db.urunler]);
  const liste = useMemo(() => {
    const l = satirlar.filter((x) => (kapsam === 'hepsi' || (kapsam === 'satilan' ? x.satilan > 0 : x.u.stok > 0)) && (!kat || x.u.kategori === kat) && (!marka || x.u.marka === marka) &&
      (!sinif || x.abc === sinif) && ara(q, x.u.ad, x.u.kod, x.u.barkod, x.u.marka));
    const v = (x: Satir): number | string => (sira.s === 'ad' ? x.u.ad : sira.s === 'stok' ? x.u.stok : sira.s === 'yeter' ? (Number.isFinite(x.yeter) ? x.yeter : 1e9) : x[sira.s]);
    return l.sort((x, y) => { const p = v(x), r = v(y); const c = typeof p === 'string' ? p.localeCompare(r as string, 'tr') : (p as number) - (r as number); return sira.azalan ? -c : c; });
  }, [satirlar, kapsam, kat, marka, sinif, q, sira]);

  const bas = (s: Sutun, ad: string, sag = true) => (
    <th key={s} className={`cursor-pointer select-none whitespace-nowrap ${sag ? 'text-right' : ''}`} onClick={() => setSira((x) => ({ s, azalan: x.s === s ? !x.azalan : s !== 'ad' && s !== 'yeter' }))}>
      {ad}{sira.s === s && (sira.azalan ? <ArrowDown size={11} className="ml-0.5 inline" /> : <ArrowUp size={11} className="ml-0.5 inline" />)}
    </th>
  );
  const csv = () => {
    const sat = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['ABC', 'Stok kodu', 'Ürün', 'Marka', 'Kategori', 'Stok', 'Satılan', 'Satış tutarı', 'Brüt kâr', 'Marj %', 'Birim kâr', 'Günlük satış', 'Stok kaç gün yeter', 'Alınacak', 'Stok değeri (maliyet)']),
      ...liste.map((x) => sat([x.abc, x.u.kod, x.u.ad, x.u.marka, x.u.kategori, x.u.stok, x.satilan, x.ciro.toFixed(2), x.kar.toFixed(2), x.marj.toFixed(1), x.birimKar.toFixed(2), x.hiz.toFixed(2), Number.isFinite(x.yeter) ? Math.round(x.yeter) : '', x.alinacak, x.stokDeger.toFixed(2)]))].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = `urun-analizi-${d.bas}-${d.bit}.csv`; el.click();
  };

  return (
    <div>
      <SayfaBaslik baslik="Ürün Analizi (ABC)" alt={`Hangi ürün kaç adet sattı, ne kadar kâr bıraktı, stok kaç gün yeter · ${gun} günlük satış verisi${ilkSatisGunu(db) && ilkSatisGunu(db)! > d.bas ? ` (${tarih(ilkSatisGunu(db)! + 'T12:00')} tarihinden beri)` : ''}`}>
        <button className="btn-ghost" onClick={csv}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>

      <div className="mb-4 grid gap-3 lg:grid-cols-4">
        {ozet.map((o) => (
          <button key={o.s} onClick={() => setSinif(sinif === o.s ? '' : o.s)} className={`card p-4 text-left transition ${sinif === o.s ? 'ring-2 ring-marka-500' : ''}`}>
            <div className="flex items-center justify-between"><span className={`rozet text-sm ${ABC_RENK[o.s]}`}>{o.s} sınıfı</span><span className="text-xs text-slate-500">{sayi(o.adet)} ürün</span></div>
            <div className="mt-2 text-2xl font-bold">%{o.pay.toFixed(0)}</div>
            <div className="text-xs text-slate-500">{TEMEL_AD[temel].replace(' göre', '').toLowerCase()} payı · stokta {para(o.stok)}</div>
          </button>
        ))}
        <button onClick={() => { setKapsam('stoklu'); setSira({ s: 'stokDeger', azalan: true }); setSinif(''); }} className="card p-4 text-left">
          <div className="text-xs font-medium text-slate-500">Bu dönemde hiç satılmayan stok</div>
          <div className="mt-2 text-2xl font-bold">{sayi(olu.length)} ürün</div>
          <div className="text-xs text-slate-500">Bağlı para: {para(oluDeger)}</div>
        </button>
      </div>
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span><b>A</b>: toplamın ilk %80'ini getiren az sayıda ürün (asla stoksuz kalmasın) · <b>B</b>: sonraki %15 · <b>C</b>: kalan %5 (az stok yeter). <b>Alınacak</b> = günlük satış × {hedefGun} gün − mevcut stok (hedef gün Ayarlar'dan değişir). Hedef sürede yarım adetten az satış beklenen ürünlere (ör. yılda bir satılan motor) alım önerilmez. Marj ve birim kâr güncel liste fiyatlarıyla, KDV hariç.{disarida.adet > 0 && <> İşçilik, hizmet ve araç alım/satım gibi {disarida.adet} stoksuz kalem ({para(disarida.ciro)}) bu analize katılmadı; bunlar Kâr/Zarar'da hizmet geliri olarak görünür.</>}</span>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Ürün, kod, barkod…" value={q} onChange={(e) => { setQ(e.target.value); setGoster(200); }} />
          <select className="inp w-52" value={temel} onChange={(e) => setTemel(e.target.value as Temel)}>{(Object.keys(TEMEL_AD) as Temel[]).map((x) => <option key={x} value={x}>ABC: {TEMEL_AD[x]}</option>)}</select>
          <select className="inp w-40" value={kapsam} onChange={(e) => setKapsam(e.target.value as typeof kapsam)}><option value="satilan">Satılan ürünler</option><option value="stoklu">Stoktaki ürünler</option><option value="hepsi">Tüm ürünler</option></select>
          <select className="inp w-40" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k}>{k}</option>)}</select>
          <select className="inp w-40" value={marka} onChange={(e) => setMarka(e.target.value)}><option value="">Tüm markalar</option>{markalar.map((k) => <option key={k}>{k}</option>)}</select>
          <span className="ml-auto text-xs text-slate-500">{sayi(liste.length)} ürün</span>
        </div>
        <div className="max-h-[62vh] overflow-auto">
          {liste.length === 0 ? <Bos metin={kapsam === 'satilan' ? 'Bu dönemde satış yok. Kapsamı "Stoktaki ürünler" yapabilir veya dönemi genişletebilirsiniz.' : 'Ürün bulunamadı.'} /> : (
            <table className="tbl">
              <thead><tr><th>ABC</th>{bas('ad', 'Ürün', false)}{bas('stok', 'Stok')}{bas('satilan', 'Satılan')}{bas('ciro', 'Satış tutarı')}{bas('kar', 'Brüt kâr')}
                {bas('marj', 'Marj')}{bas('birimKar', 'Birim kâr')}{bas('hiz', 'Günlük')}{bas('yeter', 'Stok yeter')}{bas('alinacak', 'Alınacak')}{bas('stokDeger', 'Stok değeri')}</tr></thead>
              <tbody>{liste.slice(0, goster).map((x) => (
                <tr key={x.u.id}>
                  <td><span className={`rozet ${ABC_RENK[x.abc]}`}>{x.abc}</span></td>
                  <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka, x.sonSatis && 'son satış ' + tarih(x.sonSatis)].filter(Boolean).join(' · ')}</div></td>
                  <td className={`text-right ${x.u.stok <= 0 ? 'text-red-600' : ''}`}>{sayi(x.u.stok)}</td>
                  <td className="text-right font-medium">{x.satilan ? sayi(x.satilan) : <span className="text-slate-300">0</span>}</td>
                  <td className="text-right">{x.ciro ? para(x.ciro) : '—'}</td>
                  <td className={`text-right font-semibold ${x.kar < 0 ? 'text-red-600' : x.kar > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>{x.kar ? para(x.kar) : '—'}</td>
                  <td className={`text-right ${x.maliyetYok ? 'text-slate-300' : x.marj < 0 ? 'text-red-600' : x.marj < 15 ? 'text-amber-600' : 'text-slate-600'}`}>{x.maliyetYok ? 'maliyet yok' : `%${x.marj.toFixed(0)}`}</td>
                  <td className="text-right text-slate-600">{x.maliyetYok ? '—' : para(x.birimKar)}</td>
                  <td className="text-right text-slate-500">{x.hiz ? x.hiz.toFixed(x.hiz < 1 ? 2 : 1) : '—'}</td>
                  <td className={`text-right ${Number.isFinite(x.yeter) && x.yeter < 7 ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{Number.isFinite(x.yeter) ? `${Math.round(x.yeter)} gün` : '—'}</td>
                  <td className="text-right font-semibold">{x.alinacak ? sayi(x.alinacak) : ''}</td>
                  <td className="text-right text-slate-500">{x.stokDeger ? para(x.stokDeger) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {liste.length > goster && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGoster((g) => g + 400)}>Daha fazla göster ({liste.length - goster})</button></div>}
        </div>
      </div>
    </div>
  );
}
