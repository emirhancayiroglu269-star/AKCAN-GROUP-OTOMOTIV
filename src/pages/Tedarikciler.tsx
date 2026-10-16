import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { tedarikciAnalizi } from '../lib/analiz2';
import { para, sayi } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

export default function Tedarikciler() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const t = useMemo(() => tedarikciAnalizi(db, d), [db, d]);
  const toplam = t.liste.reduce((s, x) => s + x.alis, 0) || 1;
  const kazanc = t.karsilastirma.reduce((s, x) => s + x.fark * x.liste[x.liste.length - 1].adet, 0);
  return (
    <div>
      <SayfaBaslik baslik="Tedarikçi Analizi" alt="Kimden ne kadar aldınız, aldığınız mal satıldı mı, kâr bıraktı mı" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Toplam alış (KDV hariç)" deger={para(toplam === 1 ? 0 : toplam)} alt={`${t.liste.length} tedarikçi`} />
        <Kpi etiket="En büyük tedarikçi payı" deger={t.liste[0] ? `%${((t.liste[0].alis / toplam) * 100).toFixed(0)}` : '—'} alt={t.liste[0]?.ad} renk="blue" />
        <Kpi etiket="Farklı fiyattan alınan ürün" deger={sayi(t.karsilastirma.length)} alt="Aynı ürün, birden çok tedarikçi" renk="amber" />
        <Kpi etiket="Hep en ucuzdan alınsaydı" deger={para(kazanc)} alt="Yaklaşık tasarruf (son alım adedi kadar)" renk="green" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Tedarikçiler</h3>
          {t.liste.length === 0 ? <Bos metin="Bu dönemde alış faturası yok." /> : (
            <div className="max-h-[65vh] overflow-auto"><table className="tbl">
              <thead><tr><th>Tedarikçi</th><th className="text-right">Alış</th><th className="text-right">Pay</th><th className="text-right">Fatura</th><th className="text-right">Ürün çeşidi</th><th className="text-right">Alınan → satılan</th><th className="text-right">Bu mallardan kâr</th><th className="text-right">Bakiye</th></tr></thead>
              <tbody>{t.liste.map((x) => (
                <tr key={x.guid}><td className="font-medium">{x.ad}</td><td className="text-right font-semibold">{para(x.alis)}</td><td className="text-right text-slate-500">%{((x.alis / toplam) * 100).toFixed(1)}</td>
                  <td className="text-right">{x.belge}</td><td className="text-right">{x.cesit}</td>
                  <td className="text-right text-slate-500">{sayi(Math.round(x.alinanAdet))} → {sayi(Math.round(x.satilanAdet))} <span className={x.alinanAdet ? (x.satilanAdet / x.alinanAdet < 0.3 ? 'text-red-600' : 'text-emerald-700') : ''}>(%{x.alinanAdet ? ((x.satilanAdet / x.alinanAdet) * 100).toFixed(0) : 0})</span></td>
                  <td className="text-right text-emerald-700">{para(x.kar)}</td><td className="text-right text-slate-500">{x.bakiye != null ? para(x.bakiye) : '—'}</td></tr>
              ))}</tbody>
            </table></div>
          )}
          <p className="px-4 py-2 text-xs text-slate-500">"Alınan → satılan": bu dönemde o tedarikçiden alınan ürünlerin aynı dönemde ne kadarının satıldığı (birden çok tedarikçiden alınan üründe satış alım payına göre bölünür).</p>
        </div>
        <div className="card p-4">
          <h3 className="mb-1 font-semibold">Aynı ürün, farklı fiyat</h3>
          <p className="mb-2 text-xs text-slate-500">Birden çok tedarikçiden alınan ürünlerde ortalama alış fiyatları (KDV hariç)</p>
          {t.karsilastirma.length === 0 ? <div className="text-sm text-slate-400">Yok</div> : (
            <div className="max-h-[60vh] space-y-3 overflow-auto">{t.karsilastirma.slice(0, 60).map((x) => (
              <div key={x.urun.id} className="text-sm"><div className="truncate font-medium" title={x.urun.ad}>{x.urun.ad}</div>
                {x.liste.map((l, i) => <div key={l.ad} className="flex justify-between text-xs"><span className={i === 0 ? 'text-emerald-700' : 'text-slate-500'}>{i === 0 ? '✓ ' : ''}{l.ad}</span><span>{para(l.ort)}</span></div>)}
                <div className="text-right text-[11px] text-amber-700">fark %{x.farkYuzde.toFixed(0)}</div></div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
