import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { aylikSeri, donemOzet, oncekiDonem, zamanAnalizi } from '../lib/analiz2';
import { para, sayi, tarih } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { CubukGrafik, YatayListe } from '../components/grafik';
import { Kpi, SayfaBaslik } from '../components/ui';
import { Degisim } from '../components/Degisim';

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function SatisAnalizi() {
  const { db } = useStore();
  const [d, setD] = useDonem();
  const o = useMemo(() => oncekiDonem(d), [d]);
  const s = useMemo(() => donemOzet(db, d), [db, d]);
  const p = useMemo(() => donemOzet(db, o), [db, o]);
  const z = useMemo(() => zamanAnalizi(db, d), [db, d]);
  const aylar = useMemo(() => aylikSeri(db), [db]);

  const katDegisim = useMemo(() => {
    const keys = new Set([...s.kat.keys(), ...p.kat.keys()]);
    return [...keys].map((k) => ({ ad: k, simdi: s.kat.get(k) ?? 0, once: p.kat.get(k) ?? 0 })).map((x) => ({ ...x, fark: x.simdi - x.once })).sort((a, b) => b.fark - a.fark);
  }, [s, p]);
  const urunDusus = useMemo(() => [...p.urn.entries()].map(([id, x]) => ({ ad: x.ad, once: x.ciro, simdi: s.urn.get(id)?.ciro ?? 0 })).map((x) => ({ ...x, fark: x.simdi - x.once })).filter((x) => x.fark < 0).sort((a, b) => a.fark - b.fark), [s, p]);

  return (
    <div>
      <SayfaBaslik baslik="Satış Analizi" alt={`Dönem karşılaştırması, aylık trend, gün/saat yoğunluğu · önceki dönem: ${tarih(o.bas + 'T12:00')} – ${tarih(o.bit + 'T12:00')}`} />
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiket="Satış (KDV dahil)" deger={para(s.ciro)} alt={<Degisim simdi={s.ciro} once={p.ciro} />} />
        <Kpi etiket="Brüt kâr (ürün + hizmet)" deger={para(s.kar)} alt={<Degisim simdi={s.kar} once={p.kar} />} renk="green" />
        <Kpi etiket="Fatura / fiş sayısı" deger={sayi(s.belge)} alt={<Degisim simdi={s.belge} once={p.belge} />} />
        <Kpi etiket="Ortalama sepet" deger={para(s.ortSepet)} alt={<Degisim simdi={s.ortSepet} once={p.ortSepet} />} />
        <Kpi etiket="Farklı müşteri (perakende hariç)" deger={sayi(s.musteri)} alt={<Degisim simdi={s.musteri} once={p.musteri} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-2 font-semibold">Aylık satış</h3>
          <CubukGrafik veri={aylar.map((x) => ({ etiket: AY[Number(x.ay.slice(5, 7)) - 1] + ' ' + x.ay.slice(2, 4), deger: x.ciro, alt: `${AY[Number(x.ay.slice(5, 7)) - 1]} ${x.ay.slice(0, 4)} · kâr ${para(x.kar)}` }))} bicim={para} yukseklik={220} />
          <div className="mt-3 overflow-x-auto"><table className="tbl">
            <thead><tr><th>Ay</th><th className="text-right">Satış</th><th className="text-right">Brüt kâr</th><th className="text-right">Gider</th><th className="text-right">Net</th></tr></thead>
            <tbody>{[...aylar].reverse().map((x) => <tr key={x.ay}><td>{AY[Number(x.ay.slice(5, 7)) - 1]} {x.ay.slice(0, 4)}</td><td className="text-right">{para(x.ciro)}</td><td className="text-right text-emerald-700">{para(x.kar)}</td><td className="text-right text-red-600">{para(x.masraf)}</td><td className={`text-right font-semibold ${x.kar - x.masraf < 0 ? 'text-red-600' : ''}`}>{para(x.kar - x.masraf)}</td></tr>)}</tbody>
          </table></div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="mb-1 font-semibold">Haftanın günleri</h3>
            <p className="mb-2 text-xs text-slate-500">O günün ortalama satışı</p>
            <YatayListe veri={z.gunler.map((g) => ({ ad: g.ad, deger: g.ortalama, alt: `${sayi(g.belge)} fiş · toplam ${para(g.ciro)}` }))} bicim={para} limit={7} />
          </div>
        </div>

        {z.saatVar && <div className="card p-4 lg:col-span-3">
          <h3 className="mb-2 font-semibold">Saatlere göre satış</h3>
          <CubukGrafik veri={z.saatler.slice(7, 22).map((x) => ({ etiket: String(x.saat).padStart(2, '0'), deger: x.ciro, alt: `${String(x.saat).padStart(2, '0')}:00–${String(x.saat + 1).padStart(2, '0')}:00 · ${x.belge} fiş` }))} bicim={para} yukseklik={160} />
          <p className="mt-1 text-xs text-slate-500">Saat, BizimHesap'taki sevk/işlem saatinden alınır.</p>
        </div>}

        <div className="card p-4">
          <h3 className="mb-2 font-semibold text-emerald-700">En çok artan kategoriler</h3>
          <YatayListe veri={katDegisim.filter((x) => x.fark > 0).map((x) => ({ ad: x.ad, deger: x.fark, alt: `${para(x.once)} → ${para(x.simdi)}` }))} bicim={(v) => '+' + para(v)} limit={8} bos="Artış yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold text-red-700">En çok düşen kategoriler</h3>
          <YatayListe veri={[...katDegisim].reverse().filter((x) => x.fark < 0).map((x) => ({ ad: x.ad, deger: x.fark, alt: `${para(x.once)} → ${para(x.simdi)}` }))} bicim={para} limit={8} bos="Düşüş yok" />
        </div>
        <div className="card p-4">
          <h3 className="mb-2 font-semibold text-red-700">Satışı düşen ürünler</h3>
          <YatayListe veri={urunDusus.map((x) => ({ ad: x.ad, deger: x.fark, alt: `${para(x.once)} → ${para(x.simdi)}` }))} bicim={para} limit={8} bos="Düşüş yok" />
        </div>
      </div>
    </div>
  );
}
