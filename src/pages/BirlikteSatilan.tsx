import { useMemo, useState } from 'react';
import { Info, Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { sepetAnalizi } from '../lib/analiz4';
import { ara, para, sayi } from '../lib/format';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

export default function BirlikteSatilan() {
  const { db } = useStore();
  const [d, setD] = useDonem('Tüm veri');
  const [hizmetHaric, setHizmetHaric] = useState(true);
  const [q, setQ] = useState('');
  const [secili, setSecili] = useState<string | null>(null);
  const s = useMemo(() => sepetAnalizi(db, d, hizmetHaric), [db, d, hizmetHaric]);
  const adaylar = useMemo(() => (q.length < 2 ? [] : db.urunler.filter((u) => (s.urunSatis.get(u.id) ?? 0) > 0 && ara(q, u.kod)).sort((a, b) => (s.urunSatis.get(b.id) ?? 0) - (s.urunSatis.get(a.id) ?? 0)).slice(0, 8)), [q, db, s]);
  const sec = secili ? s.urunIcin(secili) : null;
  const seciliUrun = secili ? s.urun.get(secili) : null;
  const toplamPotansiyel = s.kacanToplam;
  const yuzde = (x: number) => `%${Math.round(x * 100)}`;

  return (
    <div>
      <SayfaBaslik baslik="Birlikte Satılanlar" alt="Aynı fişte birlikte satılan ürünler: çapraz satış, kaçırılan ek satış ve eksik tamamlayıcı stok" />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <DonemSecici d={d} sec={setD} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hizmetHaric} onChange={(e) => setHizmetHaric(e.target.checked)} /> İşçilik ve hizmetleri hariç tut</label>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Satış fişi" deger={sayi(s.N)} alt={`${sayi(s.cokKalem)} tanesi birden çok ürünlü`} />
        <Kpi etiket="Fiş başına ürün" deger={s.ortKalem.toFixed(2)} alt="Ortalama farklı ürün" renk="blue" />
        <Kpi etiket="Güçlü ikili" deger={sayi(s.urunIkili.length)} alt="En az 3 fişte birlikte" renk="green" />
        <Kpi etiket="Kaçırılan ek satış (30 gün)" deger={para(toplamPotansiyel)} alt="Tahmini, kategori kurallarına göre" renk="amber" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="font-semibold">Kaçırılan ek satış</h3>
            <p className="text-xs text-slate-500">"A alan müşteri çoğunlukla B de alıyor" kuralları ve son 30 günde A satılıp B satılmayan fişler</p>
          </div>
          {s.kurallar.length === 0 ? <Bos metin="Henüz yeterli veri yok." /> : (
            <div className="max-h-[50vh] overflow-auto"><table className="tbl">
              <thead><tr><th>Alınan → genelde yanına</th><th className="text-right">Birlikte</th><th className="text-right">Son 30 günde eksik fiş</th><th className="text-right">Kaçan (tahmini)</th></tr></thead>
              <tbody>{s.kurallar.slice(0, 20).map((r, i) => (
                <tr key={i}>
                  <td><div className="font-medium">{r.a} → {r.b}</div><div className="text-xs text-slate-500">{r.a} satılan {r.nA} fişin {r.n}'inde ({yuzde(r.guven)})</div></td>
                  <td className="text-right">{yuzde(r.guven)}</td>
                  <td className="text-right font-medium">{sayi(r.eksik)}</td>
                  <td className="text-right text-amber-700">{para(r.potansiyel)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          <p className="px-4 pb-3 pt-2 text-xs text-slate-500">Kaçan tutar = eksik fiş × birlikte alınma oranı × o kategorinin ortalama satır tutarı. Tezgâhta "yanına bunu da ister misiniz?" hatırlatması için kullanın.</p>
        </div>

        <div className="card">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h3 className="font-semibold">Bu ürünü alanlar başka ne aldı?</h3>
            <div className="relative mt-2">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="inp pl-8" placeholder="Stok kodu yazın…" value={q} onChange={(e) => { setQ(e.target.value); setSecili(null); }} />
              {adaylar.length > 0 && !secili && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {adaylar.map((u) => (
                    <button key={u.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setSecili(u.id); setQ(u.kod ?? ''); }}>
                      <span className="font-mono font-medium">{u.kod}</span> <span className="text-slate-500">{u.ad}</span><span className="ml-2 text-xs text-slate-500">{s.urunSatis.get(u.id)} fiş</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!sec || !seciliUrun ? <Bos metin="Stok kodunu yazıp listeden ürünü seçin." /> : sec.liste.length === 0 ? <Bos metin={`${seciliUrun.ad} bu dönemde ${sec.nA} fişte satılmış, yanında başka ürün yok.`} /> : (
            <div className="max-h-[45vh] overflow-auto">
              <p className="px-4 pt-3 text-xs text-slate-500"><b>{seciliUrun.kod}</b> {seciliUrun.ad} · {sec.nA} fişte satıldı. Aynı fişte en sık görülenler:</p>
              <table className="tbl">
                <thead><tr><th>Ürün</th><th className="text-right">Birlikte</th><th className="text-right">Oran</th><th className="text-right">Stok</th><th className="text-right">Fiyat</th></tr></thead>
                <tbody>{sec.liste.map((x) => (
                  <tr key={x.diger.id}>
                    <td><UrunLink id={x.diger.id}>{x.diger.ad}</UrunLink><div className="text-xs text-slate-500">{x.diger.kategori}</div></td>
                    <td className="text-right">{x.n} fiş</td>
                    <td className="text-right">{yuzde(x.guven)}</td>
                    <td className={`text-right ${x.diger.stok <= 0 ? 'font-semibold text-red-600' : ''}`}>{sayi(x.diger.stok)}</td>
                    <td className="text-right">{para(x.diger.satis_fiyati)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h3 className="font-semibold">En sık birlikte satılan ürünler</h3><p className="text-xs text-slate-500">Paket fiyatı: ikisinin toplamından %5 indirimli, 5 TL'ye yuvarlanmış öneri</p></div>
          {s.urunIkili.length === 0 ? <Bos metin="En az 3 fişte birlikte satılan ürün yok." /> : (
            <div className="max-h-[55vh] overflow-auto"><table className="tbl">
              <thead><tr><th>Ürünler</th><th className="text-right">Birlikte</th><th className="text-right">Toplam fiyat</th><th className="text-right">Paket önerisi</th></tr></thead>
              <tbody>{s.urunIkili.slice(0, 40).map((x) => {
                const a = s.urun.get(x.a)!, b = s.urun.get(x.b)!; const top = a.satis_fiyati + b.satis_fiyati;
                return (
                  <tr key={x.a + x.b}>
                    <td><div><UrunLink id={a.id}>{a.ad}</UrunLink></div><div className="text-slate-500">+ <UrunLink id={b.id}>{b.ad}</UrunLink></div></td>
                    <td className="text-right">{x.n} fiş<div className="text-xs text-slate-500">{yuzde(Math.max(x.guvenAB, x.guvenBA))}</div></td>
                    <td className="text-right">{para(top)}</td>
                    <td className="text-right font-medium text-emerald-700">{top > 0 ? para(Math.round((top * 0.95) / 5) * 5) : '—'}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </div>
        <div className="card">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h3 className="font-semibold">Tamamlayıcısı stokta yok</h3><p className="text-xs text-slate-500">Birlikte satılan ikilide biri var, diğeri tükenmiş</p></div>
          {s.eksikTamamlayici.length === 0 ? <Bos metin="Sık birlikte satılan ürünlerin hepsi stokta." /> : (
            <div className="max-h-[55vh] overflow-auto"><table className="tbl">
              <tbody>{s.eksikTamamlayici.slice(0, 30).map((x, i) => (
                <tr key={i}>
                  <td><div className="font-medium text-red-600"><UrunLink id={x.yok.id}>{x.yok.ad}</UrunLink></div><div className="text-xs text-slate-500">stokta yok · {x.var.ad} alanların {yuzde(x.guven)}'i bunu da alıyor</div></td>
                  <td className="text-right text-sm">{x.n} fiş</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h3 className="font-semibold">Kategori ikilileri</h3></div>
        {s.katIkili.length === 0 ? <Bos metin="Yeterli veri yok." /> : (
          <div className="max-h-[40vh] overflow-auto"><table className="tbl">
            <thead><tr><th>Kategoriler</th><th className="text-right">Birlikte fiş</th><th className="text-right">A → B</th><th className="text-right">B → A</th></tr></thead>
            <tbody>{s.katIkili.slice(0, 30).map((x) => (
              <tr key={x.a + x.b}><td>{x.a} + {x.b}</td><td className="text-right">{x.n}</td><td className="text-right">{yuzde(x.guvenAB)}</td><td className="text-right">{yuzde(x.guvenBA)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>Veri: BizimHesap satış faturası satırları (aynı fişteki ürünler). "Oran", birinci ürünü alan fişlerin yüzde kaçında ikincisinin de olduğudur. Çok yaygın ürünlerin (balata spreyi gibi) her şeyle eşleşmesi engellenir; yalnız normalden belirgin şekilde sık birlikte satılan ikililer gösterilir.</span>
      </div>
    </div>
  );
}
