import { useMemo, useState } from 'react';
import { BadgePercent, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { indirimAnalizi } from '../lib/analiz3';
import { para, sayi } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { MusteriLink, UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

type Sekme = 'musteri' | 'urun' | 'kullanici';
const oran = (fark: number, liste: number) => (liste > 0 ? `%${((fark / liste) * 100).toFixed(1)}` : '—');

export default function IndirimAnalizi() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const a = useMemo(() => indirimAnalizi(db, d), [db, d]);
  const [sekme, setSekme] = useState<Sekme>('musteri');
  const ustaOran = a.seg.usta.liste ? (1 - a.seg.usta.ciro / a.seg.usta.liste) * 100 : 0;
  const perOran = a.seg.perakende.liste ? (1 - a.seg.perakende.ciro / a.seg.perakende.liste) * 100 : 0;
  const tab = (s: Sekme, ad: string) => <button onClick={() => setSekme(s)} className={`rounded-full px-3 py-1 text-xs ${sekme === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{ad}</button>;

  return (
    <div>
      <SayfaBaslik baslik="İndirim & Fiyat Analizi" alt="Ürünler kart fiyatının ne kadar altında satılıyor, kime ne kadar indirim yapılıyor?" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Kart fiyatı altında satılan satır" deger={`${sayi(a.alt)} / ${sayi(a.satir)}`} alt={a.satir ? `satırların %${((a.alt / a.satir) * 100).toFixed(0)}'i` : undefined} ikon={<BadgePercent size={16} />} renk="amber" />
        <Kpi etiket="Kart fiyatına göre fark (KDV dahil)" deger={para(a.fark)} alt={`Satılan ${para(a.ciro)} · kart fiyatıyla ${para(a.liste)} (${oran(a.fark, a.liste)})`} renk="red" />
        <Kpi etiket="Faturada yazan satır indirimi" deger={para(a.indirim)} alt="BizimHesap'ta iskonto olarak girilen (KDV dahil)" />
        <Kpi etiket="Usta / cari ↔ perakende" deger={`%${ustaOran.toFixed(1)} ↔ %${perOran.toFixed(1)}`} alt="Kart fiyatına göre ortalama indirim" renk="blue" />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          {tab('musteri', 'Müşteriye göre')}{tab('urun', 'Ürüne göre')}{tab('kullanici', 'Satışı yapana göre')}
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {sekme === 'musteri' && (a.musteri.length === 0 ? <Bos metin="Kart fiyatı altında satış yok." /> : (
            <table className="tbl"><thead><tr><th>Müşteri</th><th className="text-right">Satış</th><th className="text-right">Kart fiyatıyla</th><th className="text-right">Fark</th><th className="text-right">Oran</th><th className="text-right">İndirimli satır</th></tr></thead>
              <tbody>{a.musteri.slice(0, 300).map((x) => <tr key={x.ad + x.guid}><td className="max-w-[280px] truncate"><MusteriLink guid={x.guid} ad={x.ad} /></td><td className="text-right">{para(x.ciro)}</td><td className="text-right text-slate-500">{para(x.listeTutar)}</td><td className="text-right font-semibold text-red-600">{para(x.fark)}</td><td className="text-right">{oran(x.fark, x.listeTutar)}</td><td className="text-right text-slate-500">{x.altSatir} / {x.satir}</td></tr>)}</tbody></table>))}
          {sekme === 'urun' && (a.urun.length === 0 ? <Bos metin="Kart fiyatı altında satış yok." /> : (
            <table className="tbl"><thead><tr><th>Ürün</th><th className="text-right">Kart fiyatı</th><th className="text-right">Ortalama satış</th><th className="text-right">Fark</th><th className="text-right">Oran</th><th className="text-right">İndirimli satır</th></tr></thead>
              <tbody>{a.urun.slice(0, 300).map((x) => <tr key={x.u.id}><td><UrunLink id={x.u.id}>{x.u.ad}</UrunLink><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka].filter(Boolean).join(' · ')}</div></td><td className="text-right">{para(x.u.satis_fiyati)}</td><td className="text-right">{para(x.ciro / Math.max(1, x.listeTutar / x.u.satis_fiyati))}</td><td className="text-right font-semibold text-red-600">{para(x.fark)}</td><td className="text-right">{oran(x.fark, x.listeTutar)}</td><td className="text-right text-slate-500">{x.altSatir} / {x.satir}</td></tr>)}</tbody></table>))}
          {sekme === 'kullanici' && (
            <table className="tbl"><thead><tr><th>Satışı yapan</th><th className="text-right">Satış</th><th className="text-right">Kart fiyatıyla</th><th className="text-right">Fark</th><th className="text-right">Oran</th><th className="text-right">İndirimli satır</th></tr></thead>
              <tbody>{a.kullanici.map((x) => <tr key={x.ad}><td>{x.ad}</td><td className="text-right">{para(x.ciro)}</td><td className="text-right text-slate-500">{para(x.listeTutar)}</td><td className="text-right font-semibold text-red-600">{para(x.fark)}</td><td className="text-right">{oran(x.fark, x.listeTutar)}</td><td className="text-right text-slate-500">{x.altSatir} / {x.satir}</td></tr>)}</tbody></table>)}
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Fark, satış anındaki fiyat ile ürünün <b>bugünkü</b> kart satış fiyatı arasındaki farktır. Sonradan zam yaptığınız ürünlerde eski satışlar da indirimli görünebilir; bu yüzden kısa dönemlere (son 30 gün) bakmak daha doğru sonuç verir. Hizmet satırları ve kart fiyatı olmayan ürünler hesaba katılmaz.</span>
      </div>
    </div>
  );
}
