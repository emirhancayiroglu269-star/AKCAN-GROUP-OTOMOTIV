import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, ExternalLink, Info, RefreshCw, Search } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type RakipUrun, type SorulanRafa, type TyUrun } from '../lib/backend';
import { OtomarmaraArama } from './UrunAra';
import { ara, gunu, para, sayi, tarihSaat } from '../lib/format';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

const csvIndir = (ad: string, satirlar: (string | number | null | undefined)[][]) => {
  const icerik = satirlar.map((a) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = ad; el.click();
};
const katAd = (s: string | null) => (s ?? '—').split('-').map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1)).join(' ');
const aracAd = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
type Gorunum = 'sorulan' | 'cek' | 'kategori' | 'fiyat';
const kodYaz = (x: RakipUrun) => (x.kod ?? '').toUpperCase();
/** Tezgâhta sorulan parça önce, sonra pazar puanı */
const talepDeger = (x: RakipUrun) => (x.soruldu ?? 0) * 25;
const talepSirala = (a: RakipUrun, b: RakipUrun) => talepDeger(b) - talepDeger(a) || b.puan - a.puan;
async function kopyala(metin: string, mesaj: string) {
  try { await navigator.clipboard.writeText(metin); toast(mesaj); }
  catch { const t = document.createElement('textarea'); t.value = metin; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast(mesaj); }
}
function KodKopya({ x }: { x: RakipUrun }) {
  const k = kodYaz(x); if (!k) return null;
  return <button className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800" title="Kodu kopyala" onClick={(e) => { e.stopPropagation(); kopyala(k, `${k} kopyalandı`); }}>{k} <Copy size={11} /></button>;
}

/** Pazarda (Otoparçasan) öne çıkan ürünler: bizde olmayanlar → rafa çekilecekler; bizde olanlar → fiyat karşılaştırması */
export function RafaCek() {
  const { izin } = useStore();
  const [sorulan, setSorulan] = useState<SorulanRafa[]>([]);
  const [veri, setVeri] = useState<{ urunler: RakipUrun[]; sayfa: number; taranan: number; son: string | null } | null>(null);
  const [ty, setTy] = useState<Map<string, TyUrun>>(new Map());
  const [yuk, setYuk] = useState(false);
  const [gor, setGor] = useState<Gorunum>('kategori');
  const [acikKat, setAcikKat] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [kat, setKat] = useState(''); const [arac, setArac] = useState('');
  const [sadeceStokta, setSadeceStokta] = useState(true);
  const [omAcik, setOmAcik] = useState<string | null>(null);
  const oku = async () => {
    setYuk(true);
    try {
      const [p, so] = await Promise.all([backend.rakipPazar(), backend.sorulanRafa(180).catch(() => [] as SorulanRafa[])]);
      // tezgâhta sorulan kodlar pazar listesinde öne çıksın
      const kez = new Map(so.map((x) => [x.kod_norm, x.kez]));
      const norm = (k: string | null) => (k ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      setVeri({ ...p, urunler: p.urunler.map((x) => ({ ...x, soruldu: kez.get(norm(x.kod)) ?? 0 })) }); setSorulan(so);
      const t = await backend.tyOku(1).catch(() => null);
      if (t) setTy(new Map(t.urunler.filter((x) => x.urun_id).map((x) => [x.urun_id as string, x])));
    } catch (e) { toast(`Okunamadı: ${(e as Error).message}`, 'hata'); } finally { setYuk(false); }
  };
  useEffect(() => { oku(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const l = veri?.urunler ?? [];
  const kategoriler = useMemo(() => [...new Set(l.map((x) => x.kategori).filter(Boolean) as string[])].sort(), [l]);
  const araclar = useMemo(() => [...new Set(l.flatMap((x) => x.araclar))].sort(), [l]);
  const filtre = (x: RakipUrun) => (!kat || x.kategori === kat) && (!arac || x.araclar.includes(arac)) && ara(q, x.ad, x.kod, x.uretici, x.bizim_ad);
  const bizdeYok = l.filter((x) => !x.urun_id || (x.bizim_stok ?? 0) <= 0);
  const sorulanEksik = sorulan.filter((x) => (!x.urun_id || (x.bizim_stok ?? 0) <= 0) && ara(q, x.metin, x.rakip_ad, x.rakip_uretici, x.bizim_ad));
  const cek = bizdeYok.filter((x) => filtre(x) && (!sadeceStokta || x.stokta !== false)).sort(talepSirala);
  const bizde = l.filter((x) => x.urun_id && (x.bizim_stok ?? 0) > 0 && filtre(x));
  // kategori özeti (bir araç markası için ya da tümü): pazarda öne çıkan ürünlerden kaçı bizde stokta, eksikler talebe göre
  type KatGrup = { kat: string; toplam: number; bizde: number; puan: number; eksikPuan: number; eksikler: RakipUrun[] };
  const katHesapla = (marka: string): KatGrup[] => {
    const m = new Map<string, KatGrup>();
    for (const x of l) {
      if (marka && !x.araclar.includes(marka)) continue;
      if (q && !ara(q, x.ad, x.kod, x.uretici, x.kategori)) continue;
      const k = x.kategori ?? '—'; const g = m.get(k) ?? { kat: k, toplam: 0, bizde: 0, puan: 0, eksikPuan: 0, eksikler: [] };
      g.toplam++; g.puan += x.puan;
      if (x.urun_id && (x.bizim_stok ?? 0) > 0) g.bizde++;
      else { g.eksikPuan += x.puan; if (!sadeceStokta || x.stokta !== false) g.eksikler.push(x); }
      m.set(k, g);
    }
    return [...m.values()].filter((g) => g.eksikler.length).map((g) => ({ ...g, eksikler: g.eksikler.sort(talepSirala) })).sort((a, b) => b.eksikPuan - a.eksikPuan);
  };
  const katOzet = useMemo(() => katHesapla(arac), [l, arac, q, sadeceStokta]); // eslint-disable-line react-hooks/exhaustive-deps
  // araç markası özeti: her markada rafa alınacak parça sayısı ve toplam talep
  const markaOzet = useMemo(() => araclar.map((m) => { const kg = katHesapla(m); return { marka: m, kategoriler: kg, eksik: kg.reduce((t, g) => t + g.eksikler.length, 0), puan: kg.reduce((t, g) => t + g.eksikPuan, 0) }; })
    .filter((x) => x.eksik).sort((a, b) => b.puan - a.puan), [l, araclar, q, sadeceStokta]); // eslint-disable-line react-hooks/exhaustive-deps

  const durum = veri && (veri.sayfa ? `${sayi(veri.taranan)} / ${sayi(veri.sayfa)} pazar sayfası tarandı${veri.son ? ` · son ${tarihSaat(veri.son)}` : ''}` : 'Tarama hazırlanıyor…');
  const sb = (k: Gorunum, ad: string, n?: number) => <button key={k} onClick={() => setGor(k)} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${gor === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}>{ad}{n !== undefined && <span className="ml-1 opacity-60">{sayi(n)}</span>}</button>;

  const katKart = (g: KatGrup, i: number, marka: string) => {
              const oran = g.toplam ? g.bizde / g.toplam : 0; const anahtar = `${marka}|${g.kat}`; const acik = acikKat === anahtar;
              const kodlar = g.eksikler.map(kodYaz).filter(Boolean);
              return (
                <div key={anahtar} className="card">
                  <div className="flex cursor-pointer flex-wrap items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => setAcikKat(acik ? null : anahtar)}>
                    {acik ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <span className="w-6 text-right text-sm text-slate-400">{i + 1}.</span>
                    <div className="min-w-[10rem] flex-1"><div className="font-semibold">{katAd(g.kat)}</div>
                      <div className="text-xs text-slate-500">Pazarda öne çıkan {sayi(g.toplam)} parça · bizde stokta {sayi(g.bizde)} · <b className="text-red-600">rafa alınacak {sayi(g.eksikler.length)}</b></div></div>
                    <div className="w-32"><div className="h-2 rounded bg-slate-100 dark:bg-slate-800"><div className={`h-2 rounded ${oran < 0.2 ? 'bg-red-500' : oran < 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.round(oran * 100)}%` }} /></div><div className="text-[11px] text-slate-500">kapsama %{Math.round(oran * 100)}</div></div>
                    <div className="w-20 text-right"><div className="font-semibold">{g.eksikPuan.toFixed(0)}</div><div className="text-[11px] text-slate-500">talep puanı</div></div>
                    <button className="btn-ghost py-1 text-xs" disabled={!kodlar.length} onClick={(e) => { e.stopPropagation(); kopyala(kodlar.join('\n'), `${kodlar.length} kod kopyalandı`); }}><Copy size={13} /> Kodları kopyala</button>
                  </div>
                  {acik && (
                    <div className="border-t border-slate-100 dark:border-slate-800">
                      <table className="tbl">
                        <thead><tr><th>Parça</th><th>Stok kodu</th><th className="text-right">Pazar puanı</th><th className="text-right">Rakip fiyatı</th><th>Bizde</th><th /></tr></thead>
                        <tbody>{g.eksikler.slice(0, 200).map((x) => (
                          <tr key={x.url} className="align-top">
                            <td><a href={x.url} target="_blank" rel="noreferrer" className="hover:underline">{x.ad ?? x.url} <ExternalLink size={11} className="inline" /></a>
                              <div className="text-xs text-slate-500">{x.uretici ?? ''}{x.araclar.length ? ` · ${x.araclar.map(aracAd).join(', ')}` : ''}{x.soruldu ? <span className="ml-1 rozet bg-red-50 text-red-700">tezgâhta {x.soruldu} kez soruldu</span> : null}</div>
                              {omAcik === x.url && <div className="mt-2"><OtomarmaraArama q={x.kod ?? x.ad ?? ''} oto maliyet={izin('maliyet')} /></div>}</td>
                            <td><KodKopya x={x} /></td>
                            <td className="text-right font-semibold">{x.puan.toFixed(1)}<div className="text-[11px] font-normal text-slate-500">{x.gorulme} listede</div></td>
                            <td className="text-right">{x.fiyat ? para(x.fiyat) : '—'}<div className={`text-[11px] ${x.stokta === false ? 'text-red-600' : 'text-emerald-700'}`}>{x.stokta === false ? 'tükendi' : x.stokta ? 'stokta' : ''}</div></td>
                            <td className="text-sm">{x.urun_id ? <><UrunLink id={x.urun_id}>{x.bizim_ad ?? 'kart'}</UrunLink><div className="text-[11px] text-amber-700">stok 0</div></> : <span className="text-red-600">yok</span>}</td>
                            <td><button className="btn-ghost whitespace-nowrap py-1 text-xs" onClick={() => setOmAcik(omAcik === x.url ? null : x.url)}>{omAcik === x.url ? 'Kapat' : "Otomarmara'da ara"}</button></td>
                          </tr>))}</tbody>
                      </table>
                    </div>)}
                </div>);
  };

  return (
    <div>
      <SayfaBaslik baslik="Rafa Çekilecekler (pazar)" alt="Otoparçasan'da araç markası ve kategori sayfalarında öne çıkan parçalar · bizde olmayanlar rafa çekilecek, olanlar fiyat karşılaştırması">
        <button className="btn-ghost" onClick={oku} disabled={yuk}><RefreshCw size={16} className={yuk ? 'animate-spin' : ''} /> Yenile</button>
        <button className="btn-ghost" disabled={!cek.length} onClick={() => { const k = cek.map(kodYaz).filter(Boolean); kopyala(k.join('\n'), `${k.length} kod kopyalandı`); }}><Copy size={16} /> Eksik kodları kopyala</button>
        <button className="btn-ghost" disabled={!cek.length} onClick={() => csvIndir(`rafa-cek-${gunu()}.csv`, [['Parça', 'Üretici', 'Stok kodu', 'Kategori', 'Araçlar', 'Pazar puanı', 'Kaç listede', 'Otoparçasan fiyatı', 'Bizde'], ...cek.map((x) => [x.ad, x.uretici, kodYaz(x), katAd(x.kategori), x.araclar.map(aracAd).join(' '), x.puan, x.gorulme, x.fiyat, x.urun_id ? 'kart var, stok yok' : 'yok'])])}><Download size={16} /> CSV</button>
      </SayfaBaslik>
      {veri && <div className="mb-3 text-xs text-slate-500">{durum}. Tarama arka planda yavaş yavaş sürer (siteyi yormamak için), her sayfa haftada bir yenilenir.</div>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Pazarda öne çıkan parça" deger={sayi(l.length)} alt="Taranan sayfalarda listelenen" />
        <Kpi etiket="Bizde olmayan" deger={sayi(bizdeYok.length)} alt={`${sayi(bizdeYok.filter((x) => x.urun_id).length)} tanesinin kartı var ama stok 0`} renk="red" />
        <Kpi etiket="Bizde stokta" deger={sayi(l.length - bizdeYok.length)} alt="Üretici kodu / OEM eşleşmesi" renk="green" />
        <Kpi etiket="Pazarda pahalı olduğumuz" deger={sayi(bizde.filter((x) => x.eslesme === 'ayni' && x.fiyat && x.bizim_fiyat && x.bizim_fiyat > x.fiyat * 1.05).length)} alt="Aynı marka ve kodda dükkân fiyatımız %5'ten fazla yüksek" renk="amber" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm font-medium text-slate-600 dark:text-slate-300">Araç markası:</span>
        <button onClick={() => setArac('')} className={`rounded-full px-3 py-1.5 text-sm ${!arac ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>Tümü</button>
        {markaOzet.map((m) => <button key={m.marka} onClick={() => setArac(m.marka)} className={`rounded-full px-3 py-1.5 text-sm ${arac === m.marka ? 'bg-marka-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{aracAd(m.marka)} <span className="opacity-60">{sayi(m.eksik)}</span></button>)}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">{sb('sorulan', 'Tezgâhta sorulan', sorulanEksik.length)}{sb('kategori', 'Kategoriye göre (hızlı gidenler)', katOzet.length)}{sb('cek', 'Tüm eksik parçalar', cek.length)}{sb('fiyat', 'Fiyat karşılaştırma', bizde.length)}</div>
        <div className="relative min-w-[12rem] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="inp pl-9" placeholder="Parça, kod, üretici…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {gor !== 'kategori' && <select className="inp w-48" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k} value={k}>{katAd(k)}</option>)}</select>}
        {gor !== 'fiyat' && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sadeceStokta} onChange={(e) => setSadeceStokta(e.target.checked)} /> Yalnız rakipte stokta olanlar</label>}
      </div>

      {!veri ? <div className="card p-6 text-center text-sm text-slate-500">Yükleniyor…</div>
        : gor === 'sorulan' ? (
          <div className="card">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 text-sm dark:border-slate-800">
              <span>Son 6 ayda tezgâhta sorulup bizde olmayan parçalar · en çok sorulan en üstte · pazardaki (Otoparçasan) karşılığı koddan bulunur</span>
              <button className="btn-ghost ml-auto py-1 text-xs" disabled={!sorulanEksik.length} onClick={() => { const k = sorulanEksik.map((x) => x.metin.trim()); kopyala(k.join('\n'), `${k.length} kod kopyalandı`); }}><Copy size={13} /> Sorulan kodları kopyala</button>
            </div>
            {sorulanEksik.length === 0 ? <Bos metin="Sorulan ama olmayan parça kaydı yok. Ürün Ara'da bulunamayan parçada “Soruldu, yok” düğmesine basınca buraya düşer." /> : (
              <div className="max-h-[62vh] overflow-auto">
                <table className="tbl">
                  <thead><tr><th>Sorulan kod / parça</th><th className="text-right">Kaç kez</th><th>Son soruluş</th><th>Bizde</th><th>Pazardaki karşılığı</th><th /></tr></thead>
                  <tbody>{sorulanEksik.map((x) => (
                    <tr key={x.anahtar} className="align-top">
                      <td><button className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800" title="Kopyala" onClick={() => kopyala(x.metin.trim(), `${x.metin.trim()} kopyalandı`)}>{x.metin} <Copy size={11} /></button>
                        {omAcik === x.anahtar && <div className="mt-2"><OtomarmaraArama q={x.metin} oto maliyet={izin('maliyet')} /></div>}</td>
                      <td className="text-right"><b className={x.kez >= 3 ? 'text-red-600' : x.kez >= 2 ? 'text-amber-600' : ''}>{x.kez}</b>{x.adet > x.kez && <div className="text-[11px] text-slate-500">{x.adet} adet</div>}</td>
                      <td className="whitespace-nowrap text-xs">{tarihSaat(x.son)}</td>
                      <td className="text-sm">{x.urun_id ? <><UrunLink id={x.urun_id}>{x.bizim_ad ?? 'kart'}</UrunLink><div className="text-[11px] text-amber-700">stok 0</div></> : <span className="text-red-600">kart yok</span>}</td>
                      <td className="text-sm">{x.rakip_url ? <><a href={x.rakip_url} target="_blank" rel="noreferrer" className="hover:underline">{x.rakip_ad} <ExternalLink size={10} className="inline" /></a>
                        <div className="text-[11px] text-slate-500">{[x.rakip_uretici, katAd(x.rakip_kategori), x.rakip_fiyat ? para(x.rakip_fiyat) : null, x.rakip_stokta === false ? 'rakipte tükendi' : x.rakip_stokta ? 'rakipte stokta' : null].filter(Boolean).join(' · ')}</div></>
                        : <span className="text-xs text-slate-400">taranan sayfalarda yok</span>}</td>
                      <td><button className="btn-ghost whitespace-nowrap py-1 text-xs" onClick={() => setOmAcik(omAcik === x.anahtar ? null : x.anahtar)}>{omAcik === x.anahtar ? 'Kapat' : "Otomarmara'da ara"}</button></td>
                    </tr>))}</tbody>
                </table>
              </div>)}
          </div>
        )
        : !l.length ? <div className="card"><Bos metin="Pazar taraması henüz veri toplamadı; ilk sonuçlar birkaç dakika içinde gelir." /></div>
        : gor === 'cek' ? (
          <div className="card">
            {cek.length === 0 ? <Bos metin="Bu filtrede eksik parça yok." /> : (
              <div className="max-h-[62vh] overflow-auto">
                <table className="tbl">
                  <thead><tr><th>Parça</th><th>Stok kodu</th><th>Kategori</th><th className="text-right">Pazar puanı</th><th className="text-right">Rakip fiyatı</th><th>Bizde</th><th /></tr></thead>
                  <tbody>{cek.slice(0, 500).map((x) => (
                    <tr key={x.url} className="align-top">
                      <td><a href={x.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{x.ad ?? x.url} <ExternalLink size={11} className="inline" /></a>
                        <div className="text-xs text-slate-500">{x.uretici ?? ''}{x.araclar.length ? ` · ${x.araclar.map(aracAd).join(', ')}` : ''}{x.soruldu ? <span className="ml-1 rozet bg-red-50 text-red-700">tezgâhta {x.soruldu} kez soruldu</span> : null}</div>
                        {omAcik === x.url && <div className="mt-2"><OtomarmaraArama q={x.kod ?? x.ad ?? ''} oto maliyet={izin('maliyet')} /></div>}</td>
                      <td><KodKopya x={x} /></td>
                      <td className="text-sm">{katAd(x.kategori)}</td>
                      <td className="text-right font-semibold">{x.puan.toFixed(1)}<div className="text-[11px] font-normal text-slate-500">{x.gorulme} listede</div></td>
                      <td className="text-right">{x.fiyat ? para(x.fiyat) : '—'}<div className={`text-[11px] ${x.stokta === false ? 'text-red-600' : 'text-emerald-700'}`}>{x.stokta === false ? 'tükendi' : 'stokta'}</div></td>
                      <td className="text-sm">{x.urun_id ? <><UrunLink id={x.urun_id}>{x.bizim_ad ?? 'kart'}</UrunLink><div className="text-[11px] text-amber-700">stok 0</div></> : <span className="text-red-600">yok</span>}</td>
                      <td><button className="btn-ghost whitespace-nowrap py-1 text-xs" onClick={() => setOmAcik(omAcik === x.url ? null : x.url)}>{omAcik === x.url ? 'Kapat' : "Otomarmara'da ara"}</button></td>
                    </tr>))}</tbody>
                </table>
              </div>)}
          </div>
        ) : gor === 'kategori' ? (
          arac ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold">{aracAd(arac)} için rafa alınacak hızlı giden kategoriler</div>
              {katOzet.length === 0 && <div className="card"><Bos metin="Bu filtrede eksik kategori yok." /></div>}
              {katOzet.map((g, i) => katKart(g, i, arac))}
            </div>
          ) : (
            <div className="space-y-5">
              {markaOzet.length === 0 && <div className="card"><Bos metin="Bu filtrede eksik parça yok." /></div>}
              {markaOzet.map((m) => (
                <div key={m.marka}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold">{aracAd(m.marka)}</h3>
                    <span className="text-xs text-slate-500">rafa alınacak {sayi(m.eksik)} parça · {m.kategoriler.length} kategori</span>
                    <button className="btn-ghost py-1 text-xs" onClick={() => { const k = m.kategoriler.flatMap((g) => g.eksikler).map(kodYaz).filter(Boolean); kopyala([...new Set(k)].join('\n'), `${aracAd(m.marka)}: ${new Set(k).size} kod kopyalandı`); }}><Copy size={13} /> {aracAd(m.marka)} kodlarını kopyala</button>
                    <button className="ml-auto text-xs text-marka-600 hover:underline" onClick={() => setArac(m.marka)}>Tüm {aracAd(m.marka)} kategorileri →</button>
                  </div>
                  <div className="space-y-2">{m.kategoriler.slice(0, 5).map((g, i) => katKart(g, i, m.marka))}</div>
                  {m.kategoriler.length > 5 && <button className="mt-1 text-xs text-slate-500 hover:underline" onClick={() => setArac(m.marka)}>+ {m.kategoriler.length - 5} kategori daha</button>}
                </div>))}
            </div>
          )
        ) : (
          <div className="card">
            {bizde.length === 0 ? <Bos metin="Henüz eşleşen ürün yok." /> : (
              <div className="max-h-[62vh] overflow-auto">
                <table className="tbl">
                  <thead><tr><th>Ürün (bizde)</th><th className="text-right">Stok</th><th className="text-right">Dükkân fiyatı</th><th className="text-right">Trendyol fiyatımız</th><th className="text-right">Otoparçasan</th><th className="text-right">Fark</th></tr></thead>
                  <tbody>{[...bizde].sort((a, b) => Number(b.eslesme === 'ayni') - Number(a.eslesme === 'ayni') || ((b.bizim_fiyat ?? 0) / (b.fiyat || Infinity)) - ((a.bizim_fiyat ?? 0) / (a.fiyat || Infinity))).slice(0, 500).map((x) => {
                    const t = x.urun_id ? ty.get(x.urun_id) : undefined; const fark = x.fiyat && x.bizim_fiyat ? (x.bizim_fiyat / x.fiyat - 1) * 100 : null;
                    // muadil = farklı marka (ör. markasız Tayvan malı ↔ Filtron): fiyatı kıyaslanmaz, yalnız bilgi
                    const ayni = x.eslesme === 'ayni';
                    return (
                      <tr key={x.url}>
                        <td><UrunLink id={x.urun_id!}>{x.bizim_ad}</UrunLink> <span className={`rozet ${x.eslesme === 'ayni' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{x.eslesme === 'ayni' ? 'aynı ürün' : 'muadil'}</span><div className="text-xs text-slate-500"><a href={x.url} target="_blank" rel="noreferrer" className="hover:underline">{x.ad} <ExternalLink size={10} className="inline" /></a></div></td>
                        <td className="text-right">{sayi(x.bizim_stok ?? 0)}</td>
                        <td className="text-right">{x.bizim_fiyat ? para(x.bizim_fiyat) : '—'}</td>
                        <td className="text-right">{t?.satis_fiyati ? para(t.satis_fiyati) : <span className="text-slate-400">ilan yok</span>}</td>
                        <td className="text-right font-medium">{x.fiyat ? para(x.fiyat) : '—'}</td>
                        <td className={`text-right font-semibold ${fark === null || !ayni ? 'text-slate-400' : fark > 5 ? 'text-red-600' : fark < -5 ? 'text-emerald-700' : 'text-slate-600'}`}>{fark === null ? '—' : `${fark > 0 ? '+' : ''}%${fark.toFixed(0)}`}{!ayni && <div className="text-[11px] font-normal">farklı marka{x.uretici ? ` (${x.uretici})` : ''}, kıyaslanmaz</div>}</td>
                      </tr>); })}</tbody>
                </table>
              </div>)}
          </div>
        )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Otoparçasan satış adedini sayfanın kendisinde yayınlamaz. Pazar puanı, parçanın araç markası × kategori sayfalarının ilk sayfasında kaç kez ve ne kadar üst sırada listelendiğidir (site "Önerilen" sıralamada çok satan ve stoklu ürünleri öne alır); yüksek puan = çok aranan, hızlı giden parça. Eşleşme: "aynı ürün" = üretici kodu ve markası bizdeki stok koduyla aynı; "muadil" = OEM/muadil kodu tutuyor ve kategori uyumlu (farklı kategorideki kod çakışmaları eşleştirilmez). Kodu farklı yazılmış ürünler "yok" görünebilir. Rafa almadan önce tedarikçi fiyatını Otomarmara düğmesiyle kontrol edin.</p>
    </div>
  );
}
