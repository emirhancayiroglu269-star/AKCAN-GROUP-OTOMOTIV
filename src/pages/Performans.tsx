import { useEffect, useMemo, useState } from 'react';
import { backend } from '../lib/backend';
import { gunu, parse } from '../lib/format';
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
                    <td className={`text-right ${x.ciroNet <= 0 ? 'text-slate-300' : x.marj < genelMarj - 5 ? 'font-semibold text-red-600' : x.marj > genelMarj + 3 ? 'text-emerald-700' : ''}`}>{x.ciroNet > 0 ? `%${x.marj.toFixed(1)}` : '—'}</td>
                    <td className="text-right">{para(x.indirim)}</td>
                    <td className={`text-right ${indOran > genelInd * 1.5 && indOran > 3 ? 'font-semibold text-red-600' : 'text-slate-500'}`}>%{indOran.toFixed(1)}</td>
                    <td className="text-right">{sayi(x.belge)}</td>
                    <td className="text-right text-slate-500">{para(x.belge ? x.ciro / x.belge : 0)}</td>
                  </tr>);
              })}</tbody>
            </table>
          </div>)}
      </div>
      <PrimTablosu />
      <AylikTrend />
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

const ayDonem = (geri: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - geri); const bas = gunu(d); const s = new Date(d); s.setMonth(s.getMonth() + 1); s.setDate(0); return { bas, bit: geri === 0 ? gunu() : gunu(s) }; };
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ayAdi = (geri: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - geri); return `${AY[d.getMonth()]} ${d.getFullYear()}`; };

/** Aylık hedef ve prim: prim = o ayın kârı × oran; hedef tutturma çubuğu */
function PrimTablosu() {
  const { db, calistir } = useStore();
  const [geri, setGeri] = useState(0);
  const kayitli = db.ayarlar.personel_prim ?? { oran: 0, hedefler: {} };
  const [oran, setOran] = useState(String(kayitli.oran || ''));
  const [hedef, setHedef] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(kayitli.hedefler ?? {}).map(([k, v]) => [k, String(v)])));
  useEffect(() => { setOran(String(kayitli.oran || '')); setHedef(Object.fromEntries(Object.entries(kayitli.hedefler ?? {}).map(([k, v]) => [k, String(v)]))); }, [db.ayarlar.personel_prim]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = ayDonem(geri);
  const l = useMemo(() => personelPerformans(db, d).filter((x) => x.anahtar !== '—'), [db, d.bas, d.bit]); // eslint-disable-line react-hooks/exhaustive-deps
  const o = parse(oran) || 0;
  const degisti = o !== (kayitli.oran || 0) || l.some((x) => (parse(hedef[x.ad] ?? '') || 0) !== (kayitli.hedefler?.[x.ad] ?? 0));
  const kaydet = () => calistir(() => backend.ayarKaydet({ personel_prim: { oran: o, hedefler: Object.fromEntries(Object.entries({ ...kayitli.hedefler, ...Object.fromEntries(Object.entries(hedef).map(([k, v]) => [k, parse(v) || 0])) }).filter(([, v]) => v > 0)) } }), 'Prim ayarları kaydedildi');
  // ay içinde geçen gün oranı: bu ay için hedefe gidişat tahmini
  const bugun = new Date(); const ayGun = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0).getDate(); const gecen = geri === 0 ? bugun.getDate() / ayGun : 1;
  const toplamPrim = l.reduce((t, x) => t + Math.max(0, x.kar) * o / 100, 0);
  return (
    <div className="card mt-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <b>Aylık hedef & prim</b>
        <select className="inp w-40 py-1" value={geri} onChange={(e) => setGeri(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>{ayAdi(g)}</option>)}</select>
        <label className="ml-auto flex items-center gap-1.5 text-sm">Prim oranı: kârın %<input className="inp w-16 py-1 text-right" inputMode="decimal" value={oran} onChange={(e) => setOran(e.target.value)} placeholder="0" /></label>
        <button className="btn-primary py-1" disabled={!degisti} onClick={kaydet}>Kaydet</button>
      </div>
      {l.length === 0 ? <Bos metin="Bu ayda satış yok." /> : (
        <div className="overflow-auto">
          <table className="tbl">
            <thead><tr><th>Personel</th><th className="text-right">Satış</th><th className="w-32 text-right">Aylık hedef</th><th className="w-48">Hedefe ilerleme</th><th className="text-right">Kâr</th><th className="text-right">Prim</th></tr></thead>
            <tbody>{l.map((x) => {
              const h = parse(hedef[x.ad] ?? '') || 0; const yuzde = h > 0 ? (x.ciro / h) * 100 : 0; const tahmin = h > 0 && gecen < 1 ? (x.ciro / gecen / h) * 100 : null;
              return (
                <tr key={x.anahtar}>
                  <td className="font-medium">{x.ad}</td>
                  <td className="text-right font-semibold">{para(x.ciro)}</td>
                  <td><input className="inp py-1 text-right" inputMode="decimal" placeholder="—" value={hedef[x.ad] ?? ''} onChange={(e) => setHedef({ ...hedef, [x.ad]: e.target.value })} /></td>
                  <td>{h > 0 ? <div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${yuzde >= 100 ? 'bg-emerald-500' : yuzde >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, yuzde)}%` }} /></div>
                    <div className="mt-0.5 text-[11px] text-slate-500">%{yuzde.toFixed(0)}{yuzde >= 100 ? ' ✓ hedef tuttu' : ''}{tahmin !== null && yuzde < 100 ? ` · bu hızla ay sonu %${tahmin.toFixed(0)}` : ''}</div>
                  </div> : <span className="text-xs text-slate-400">hedef girin</span>}</td>
                  <td className="text-right text-emerald-700">{para(x.kar)}</td>
                  <td className="text-right text-base font-bold">{o > 0 ? para(Math.max(0, x.kar) * o / 100) : '—'}</td>
                </tr>);
            })}</tbody>
            {o > 0 && <tfoot><tr><td colSpan={5} className="text-right text-sm text-slate-500">Toplam prim</td><td className="text-right text-base font-bold">{para(toplamPrim)}</td></tr></tfoot>}
          </table>
        </div>)}
      <div className="border-t border-slate-100 p-3 text-xs text-slate-500 dark:border-slate-800">Prim = o ayın kârı (KDV hariç satış − alış maliyeti) × oran. Hedef satış tutarı (KDV dahil) üzerinden; bu ay için ayın kaçta kaçının geçtiğine göre ay sonu tahmini gösterilir. Hedef ve oran Ayarlar'a kaydedilir.</div>
    </div>
  );
}

/** Son 6 ay, kişi başı satış ve kâr */
function AylikTrend() {
  const { db } = useStore();
  const aylar = useMemo(() => [5, 4, 3, 2, 1, 0].map((g) => ({ ad: ayAdi(g), l: personelPerformans(db, ayDonem(g)) })), [db]);
  const kisiler = useMemo(() => { const m = new Map<string, number>(); for (const a of aylar) for (const x of a.l) m.set(x.ad, (m.get(x.ad) ?? 0) + x.ciro); return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k); }, [aylar]);
  const [olcu, setOlcu] = useState<'ciro' | 'kar'>('ciro');
  const enBuyuk = Math.max(1, ...aylar.flatMap((a) => a.l.map((x) => (olcu === 'ciro' ? x.ciro : x.kar))));
  return (
    <div className="card mt-4">
      <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800"><b>Son 6 ay</b>
        <div className="ml-auto flex rounded-full bg-slate-100 p-0.5 text-xs dark:bg-slate-800">{([['ciro', 'Satış'], ['kar', 'Kâr']] as const).map(([k, ad]) => <button key={k} onClick={() => setOlcu(k)} className={`rounded-full px-3 py-1 ${olcu === k ? 'bg-white font-semibold shadow-sm dark:bg-slate-900' : 'text-slate-500'}`}>{ad}</button>)}</div>
      </div>
      <div className="overflow-auto">
        <table className="tbl">
          <thead><tr><th>Personel</th>{aylar.map((a) => <th key={a.ad} className="text-right">{a.ad.split(' ')[0]}</th>)}</tr></thead>
          <tbody>{kisiler.map((k) => (
            <tr key={k}><td className="font-medium">{k}</td>{aylar.map((a) => { const x = a.l.find((y) => y.ad === k); const v = x ? (olcu === 'ciro' ? x.ciro : x.kar) : 0; return (
              <td key={a.ad} className="text-right"><div className="text-sm">{v ? para(v) : <span className="text-slate-300">—</span>}</div>
                {v > 0 && <div className="ml-auto mt-0.5 h-1 rounded-full bg-marka-500/70" style={{ width: `${Math.max(4, (v / enBuyuk) * 100)}%` }} />}</td>); })}</tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
