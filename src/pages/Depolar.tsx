import { useMemo } from 'react';
import { Info, Warehouse } from 'lucide-react';
import { useStore } from '../lib/store';
import { depoAnalizi } from '../lib/analiz3';
import { para, sayi } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { PayCubugu, YatayListe } from '../components/grafik';
import { Bos, SayfaBaslik } from '../components/ui';

const RENK = ['var(--seri-1)', 'var(--seri-2)', 'var(--seri-3)'];

export default function Depolar() {
  const { db, izin } = useStore(); const maliyet = izin('maliyet');
  const [d, setD] = useDonem();
  const a = useMemo(() => depoAnalizi(db, d), [db, d]);
  const topCiro = a.depolar.reduce((t, x) => t + x.ciro, 0) + a.belirsiz;

  return (
    <div>
      <SayfaBaslik baslik="Depo Karşılaştırması" alt="Depoların satış, kâr ve stok durumu" />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      {a.depolar.length === 0 ? <div className="card"><Bos metin="Depo bilgisi yok." /></div> : <>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {a.depolar.map((x, i) => (
            <div key={x.ad} className="card p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold"><Warehouse size={18} style={{ color: RENK[i % 3] }} /> {x.ad}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-slate-500">Satış (KDV dahil)</div><div className="text-lg font-bold">{para(x.ciro)}</div><div className="text-xs text-slate-500">{sayi(x.fis)} fiş · ort. {para(x.fis ? x.ciro / x.fis : 0)}</div></div>
                {maliyet && <div><div className="text-xs text-slate-500">Brüt kâr</div><div className="text-lg font-bold">{para(x.kar)}</div><div className="text-xs text-slate-500">{x.net ? `KDV hariç satışın %${((x.kar / x.net) * 100).toFixed(0)}'i` : ''}</div></div>}
                {maliyet && <div><div className="text-xs text-slate-500">Stok değeri (maliyet)</div><div className="font-bold">{para(x.stokDeger)}</div><div className="text-xs text-slate-500">{sayi(x.stokCesit)} çeşit</div></div>}
                {maliyet && <div><div className="text-xs text-slate-500">90 gündür satılmayan (son 90 günde alınanlar hariç)</div><div className="font-bold text-amber-700">{para(x.oluDeger)}</div><div className="text-xs text-slate-500">{sayi(x.oluCesit)} çeşit · stoğun %{x.stokDeger ? ((x.oluDeger / x.stokDeger) * 100).toFixed(0) : 0}'i</div></div>}
                {maliyet && <div className="col-span-2 text-xs text-slate-500">Bu dönemde bu depoya alış: {para(x.alis)}{x.stokDeger && x.net ? ` · stok, bu dönemin KDV hariç satışının ${(x.stokDeger / x.net).toFixed(1)} katı` : ''}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <h3 className="mb-1 font-semibold">Satışın depolara dağılımı</h3>
            <p className="mb-3 text-xs text-slate-500">Seçili dönem · KDV dahil</p>
            <PayCubugu bicim={para} parcalar={[...a.depolar.map((x, i) => ({ ad: x.ad, deger: x.ciro, renk: RENK[i % 3] })), ...(a.belirsiz > 0 ? [{ ad: 'Depo belirtilmemiş (hizmet vb.)', deger: a.belirsiz, renk: '#94a3b8' }] : [])]} />
            {a.belirsiz > 0 && <p className="mt-2 text-xs text-slate-500">Depo seçilmeden kesilen faturalar (çoğu işçilik/hizmet) toplamın %{((a.belirsiz / (topCiro || 1)) * 100).toFixed(0)}'i.</p>}
          </div>
          {a.depolar.slice(0, 2).map((x, i) => (
            <div key={x.ad} className="card p-4">
              <h3 className="mb-3 font-semibold">{x.ad.replace(/ DEPO$/i, '')} — en çok satanlar</h3>
              <YatayListe veri={x.enCok.map((y) => ({ ad: y.ad, deger: y.ciro }))} bicim={para} limit={8} renk={i === 0 ? 'bg-sky-500' : 'bg-emerald-500'} bos="Bu dönemde satış yok" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Info size={15} className="mt-0.5 shrink-0" /><span>Depolar arası transfer ve depo bazında sipariş listeleri "Siparişler" sekmesinde. Depo seçilmeden kesilen faturalar (hizmet vb.) ayrı gösterilir; araç alım/satım faturaları satışa katılmaz. Depo stokları BizimHesap'tan birkaç dakikada bir gelir.</span>
        </div>
      </>}
    </div>
  );
}
