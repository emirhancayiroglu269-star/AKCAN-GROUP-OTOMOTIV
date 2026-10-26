import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { musteriKarlilik, personelPerformans, type Performans } from '../lib/analiz5';
import { ara, para, sayi, tarih } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { MusteriLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

const yuzde = (a: number, b: number) => (b > 0 ? `%${((a / b) * 100).toFixed(1)}` : '—');

/** Satışı yapana göre: ciro, kâr, marj, indirim */
export function PersonelPerformans() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const l = useMemo(() => personelPerformans(db, d), [db, d]);
  const top = l.reduce((t, x) => ({ ciro: t.ciro + x.ciro, kar: t.kar + x.kar, net: t.net + x.ciroNet, ind: t.ind + x.indirim, liste: t.liste + x.liste }), { ciro: 0, kar: 0, net: 0, ind: 0, liste: 0 });
  const genelMarj = top.net > 0 ? (top.kar / top.net) * 100 : 0;
  const enCok = l[0]; const enKarli = [...l].filter((x) => x.ciroNet > 0).sort((a, b) => b.kar - a.kar)[0];
  return (
    <div>
      <SayfaBaslik baslik="Personel Performansı" alt="Kim ne kadar sattı, ne kadar kâr bıraktı, ne kadar indirim yaptı · BizimHesap faturasındaki kullanıcıya göre" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Toplam satış" deger={para(top.ciro)} alt={`${l.length} kişi`} />
        <Kpi etiket="Toplam kâr (KDV hariç)" deger={para(top.kar)} alt={`Ortalama marj %${genelMarj.toFixed(1)}`} renk="green" />
        <Kpi etiket="En çok satan" deger={enCok?.ad ?? '—'} alt={enCok ? para(enCok.ciro) : ''} renk="blue" />
        <Kpi etiket="En çok kâr bırakan" deger={enKarli?.ad ?? '—'} alt={enKarli ? para(enKarli.kar) : ''} renk="green" />
      </div>
      <div className="card">
        {l.length === 0 ? <Bos metin="Bu dönemde satış yok." /> : (
          <div className="overflow-auto">
            <table className="tbl">
              <thead><tr><th>Satışı yapan</th><th className="text-right">Satış (KDV dahil)</th><th className="text-right">Pay</th><th className="text-right">Kâr</th><th className="text-right">Marj</th><th className="text-right">Kart fiyatından indirim</th><th className="text-right">İndirim oranı</th><th className="text-right">Fatura</th><th className="text-right">Ort. fatura</th></tr></thead>
              <tbody>{l.map((x) => {
                const indOran = x.liste > 0 ? (x.indirim / x.liste) * 100 : 0; const genelInd = top.liste > 0 ? (top.ind / top.liste) * 100 : 0;
                return (
                  <tr key={x.anahtar}>
                    <td className="font-medium">{x.ad}</td>
                    <td className="text-right font-semibold">{para(x.ciro)}</td>
                    <td className="text-right text-slate-500">{yuzde(x.ciro, top.ciro)}</td>
                    <td className="text-right text-emerald-700">{para(x.kar)}</td>
                    <td className={`text-right ${x.marj < genelMarj - 5 ? 'font-semibold text-red-600' : x.marj > genelMarj + 3 ? 'text-emerald-700' : ''}`}>%{x.marj.toFixed(1)}</td>
                    <td className="text-right">{para(x.indirim)}</td>
                    <td className={`text-right ${indOran > genelInd * 1.5 && indOran > 3 ? 'font-semibold text-red-600' : 'text-slate-500'}`}>%{indOran.toFixed(1)}</td>
                    <td className="text-right">{sayi(x.belge)}</td>
                    <td className="text-right text-slate-500">{para(x.belge ? x.ciro / x.belge : 0)}</td>
                  </tr>);
              })}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Kâr: KDV hariç satış − alış maliyeti (alış fiyatı olmayan satırlar kâra katılmaz). İndirim: ürün kartındaki satış fiyatı ile faturadaki fiyat arasındaki fark. Ortalamanın belirgin altındaki marj ve ortalamanın 1,5 katından fazla indirim kırmızı görünür. Araç alım (geçiş) faturaları hariç.</p>
    </div>
  );
}

type UstaFiltre = 'hepsi' | 'dusuk' | 'indirim' | 'kaybolan';

/** Müşteri / usta kârlılığı: kim çok alıyor ama az kâr bırakıyor */
export function UstaKarlilik() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const [q, setQ] = useState('');
  const [f, setF] = useState<UstaFiltre>('hepsi');
  const tum = useMemo(() => musteriKarlilik(db, d), [db, d]);
  const per = tum.find((x) => x.perakende);
  const cariler = tum.filter((x) => !x.perakende);
  const top = tum.reduce((t, x) => ({ kar: t.kar + x.kar, net: t.net + x.ciroNet }), { kar: 0, net: 0 });
  const genelMarj = top.net > 0 ? (top.kar / top.net) * 100 : 0;
  const perMarj = per?.marj ?? genelMarj;
  const ciroSinir = cariler.length ? cariler[Math.min(cariler.length - 1, 19)].ciro : 0; // ilk 20 müşterinin alt sınırı
  const simdi = Date.now();
  const durum = (x: Performans) => ({
    dusuk: x.ciro >= ciroSinir && x.ciroNet > 0 && x.marj < genelMarj * 0.6,
    indirim: x.liste > 0 && x.indirim / x.liste > 0.12,
    kaybolan: x.belge >= 3 && simdi - new Date(x.son).getTime() > 30 * 864e5,
  });
  const say = (k: Exclude<UstaFiltre, 'hepsi'>) => cariler.filter((x) => durum(x)[k]).length;
  const liste = cariler.filter((x) => ara(q, x.ad) && (f === 'hepsi' || durum(x)[f]));
  const fBtn = (k: UstaFiltre, ad: string, n?: number) => <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1.5 text-sm ${f === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad}{n !== undefined && <span className="ml-1 opacity-60">{n}</span>}</button>;
  return (
    <div>
      <SayfaBaslik baslik="Usta & Müşteri Kârlılığı" alt="Kim çok alıyor ama az kâr bırakıyor, kime fazla indirim yapılıyor, kim gelmeyi bıraktı" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Genel marj" deger={`%${genelMarj.toFixed(1)}`} alt={`Perakende %${perMarj.toFixed(1)}`} renk="green" />
        <Kpi etiket="Çok alıp az kâr bırakan" deger={sayi(say('dusuk'))} alt={`İlk 20 müşteri içinde, marjı %${(genelMarj * 0.6).toFixed(0)} altında`} renk="red" />
        <Kpi etiket="%12'den fazla indirim alan" deger={sayi(say('indirim'))} alt="Kart fiyatına göre" renk="amber" />
        <Kpi etiket="Gelmeyi bırakan" deger={sayi(say('kaybolan'))} alt="Dönemde 3+ fatura, 30 gündür yok" renk="amber" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {fBtn('hepsi', 'Tümü', cariler.length)}{fBtn('dusuk', 'Az kâr bırakan', say('dusuk'))}{fBtn('indirim', 'Fazla indirim', say('indirim'))}{fBtn('kaybolan', 'Gelmeyi bırakan', say('kaybolan'))}
        <input className="inp ml-auto max-w-xs" placeholder="Müşteri / usta ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card">
        {liste.length === 0 ? <Bos metin="Bu filtrede müşteri yok." /> : (
          <div className="max-h-[62vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Müşteri / usta</th><th className="text-right">Satış</th><th className="text-right">Kâr</th><th className="text-right">Marj</th><th className="text-right">İndirim</th><th className="text-right">Fatura</th><th className="text-right">Son alış</th></tr></thead>
              <tbody>{liste.slice(0, 400).map((x) => { const z = durum(x); const ind = x.liste > 0 ? (x.indirim / x.liste) * 100 : 0; const gun = Math.floor((simdi - new Date(x.son).getTime()) / 864e5); return (
                <tr key={x.anahtar}>
                  <td><div className="font-medium"><MusteriLink guid={x.guid} ad={x.ad} /></div>
                    <div className="mt-0.5 flex flex-wrap gap-1">{z.dusuk && <span className="rozet bg-red-50 text-red-700">çok alıyor, az kâr</span>}{z.indirim && <span className="rozet bg-amber-50 text-amber-800">fazla indirim</span>}{z.kaybolan && <span className="rozet bg-slate-100 text-slate-600">{gun} gündür gelmedi</span>}</div></td>
                  <td className="text-right font-semibold">{para(x.ciro)}</td>
                  <td className="text-right text-emerald-700">{para(x.kar)}</td>
                  <td className={`text-right ${x.ciroNet <= 0 ? 'text-slate-300' : x.marj < genelMarj * 0.6 ? 'font-semibold text-red-600' : x.marj > genelMarj ? 'text-emerald-700' : ''}`}>{x.ciroNet > 0 ? `%${x.marj.toFixed(1)}` : '—'}</td>
                  <td className={`text-right ${ind > 12 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>{para(x.indirim)} <span className="text-[11px]">(%{ind.toFixed(0)})</span></td>
                  <td className="text-right">{sayi(x.belge)}</td>
                  <td className="text-right text-xs text-slate-500">{tarih(x.son)}</td>
                </tr>); })}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Perakende faturalar tek satırda toplanır ve bu listeye girmez. "Çok alıyor, az kâr": dönemde en çok alan 20 müşteri içinde marjı genel marjın %60'ının altında kalanlar — özel fiyatı gözden geçirmeye değer. İndirim kart satış fiyatına göre hesaplanır.</p>
    </div>
  );
}
