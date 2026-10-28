import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, ExternalLink, Info, RefreshCw, Search } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type RakipUrun, type TyUrun } from '../lib/backend';
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
type Gorunum = 'cek' | 'kategori' | 'fiyat';
const kodYaz = (x: RakipUrun) => (x.kod ?? '').toUpperCase();
/** Elle girilen rozet (satın aldı > sepette > inceledi) varsa önce o, yoksa pazar puanı */
const talepDeger = (x: RakipUrun) => (x.satin_aldi ?? 0) * 10 + (x.sepette ?? 0) * 3 + (x.inceledi ?? 0) * 0.2;
const talepSirala = (a: RakipUrun, b: RakipUrun) => talepDeger(b) - talepDeger(a) || b.puan - a.puan;
async function kopyala(metin: string, mesaj: string) {
  try { await navigator.clipboard.writeText(metin); toast(mesaj); }
  catch { const t = document.createElement('textarea'); t.value = metin; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast(mesaj); }
}
/** Kullanıcının Otoparçasan sayfasında gördüğü rozet: satın aldı / sepetinde / inceledi (elle girilir, kaydedilir) */
function TalepGir({ x, kaydet }: { x: RakipUrun; kaydet: (url: string, n: { satin_aldi: number | null; sepette: number | null; inceledi: number | null }) => void }) {
  const [d, setD] = useState({ s: x.satin_aldi?.toString() ?? '', p: x.sepette?.toString() ?? '', i: x.inceledi?.toString() ?? '' });
  const sayiAl = (v: string) => { const n = parseInt(v.replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null; };
  const yaz = () => {
    const n = { satin_aldi: sayiAl(d.s), sepette: sayiAl(d.p), inceledi: sayiAl(d.i) };
    if (n.satin_aldi === (x.satin_aldi ?? null) && n.sepette === (x.sepette ?? null) && n.inceledi === (x.inceledi ?? null)) return;
    kaydet(x.url, n);
  };
  const kutu = (k: 's' | 'p' | 'i', ad: string, renk: string) => (
    <label className="flex items-center gap-1" title={ad}><span className={`text-[10px] ${renk}`}>{ad}</span>
      <input className="inp w-12 px-1 py-0.5 text-right text-xs" inputMode="numeric" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} onBlur={yaz} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} onClick={(e) => e.stopPropagation()} /></label>);
  return <div className="flex flex-wrap items-center gap-1.5">{kutu('s', 'aldı', 'text-emerald-700')}{kutu('p', 'sepet', 'text-amber-700')}{kutu('i', 'inceledi', 'text-slate-500')}</div>;
}
function KodKopya({ x }: { x: RakipUrun }) {
  const k = kodYaz(x); if (!k) return null;
  return <button className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800" title="Kodu kopyala" onClick={(e) => { e.stopPropagation(); kopyala(k, `${k} kopyalandı`); }}>{k} <Copy size={11} /></button>;
}

/** Pazarda (Otoparçasan) öne çıkan ürünler: bizde olmayanlar → rafa çekilecekler; bizde olanlar → fiyat karşılaştırması */
export function RafaCek() {
  const { izin } = useStore();
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
      setVeri(await backend.rakipPazar());
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
  const notKaydet = async (url: string, n: { satin_aldi: number | null; sepette: number | null; inceledi: number | null }) => {
    try { await backend.rakipNotKaydet(url, n); setVeri((v) => v && { ...v, urunler: v.urunler.map((x) => (x.url === url ? { ...x, ...n } : x)) }); toast('Talep bilgisi kaydedildi'); }
    catch (e) { toast(`Kaydedilemedi: ${(e as Error).message}`, 'hata'); }
  };
  const cek = bizdeYok.filter((x) => filtre(x) && (!sadeceStokta || x.stokta !== false)).sort(talepSirala);
  const bizde = l.filter((x) => x.urun_id && (x.bizim_stok ?? 0) > 0 && filtre(x));
  // kategori × araç: pazarda öne çıkan ürünlerden kaçı bizde stokta
  const katOzet = useMemo(() => {
    const m = new Map<string, { kat: string; toplam: number; bizde: number; puan: number; eksikPuan: number; eksikler: RakipUrun[] }>();
    for (const x of l) {
      if (arac && !x.araclar.includes(arac)) continue;
      if (q && !ara(q, x.ad, x.kod, x.uretici, x.kategori)) continue;
      const k = x.kategori ?? '—'; const g = m.get(k) ?? { kat: k, toplam: 0, bizde: 0, puan: 0, eksikPuan: 0, eksikler: [] };
      g.toplam++; g.puan += x.puan;
      if (x.urun_id && (x.bizim_stok ?? 0) > 0) g.bizde++;
      else { g.eksikPuan += x.puan; if (!sadeceStokta || x.stokta !== false) g.eksikler.push(x); }
      m.set(k, g);
    }
    // hızlı giden kategori: bizde eksik kalan parçaların toplam pazar puanı en yüksek olanlar
    return [...m.values()].filter((g) => g.eksikler.length).map((g) => ({ ...g, eksikler: g.eksikler.sort(talepSirala) })).sort((a, b) => b.eksikPuan - a.eksikPuan);
  }, [l, arac, q, sadeceStokta]);

  const durum = veri && (veri.sayfa ? `${sayi(veri.taranan)} / ${sayi(veri.sayfa)} pazar sayfası tarandı${veri.son ? ` · son ${tarihSaat(veri.son)}` : ''}` : 'Tarama hazırlanıyor…');
  const sb = (k: Gorunum, ad: string, n?: number) => <button key={k} onClick={() => setGor(k)} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${gor === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}>{ad}{n !== undefined && <span className="ml-1 opacity-60">{sayi(n)}</span>}</button>;

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
        <Kpi etiket="Pazarda pahalı olduğumuz" deger={sayi(bizde.filter((x) => x.fiyat && x.bizim_fiyat && x.bizim_fiyat > x.fiyat * 1.05).length)} alt="Dükkân fiyatımız %5'ten fazla yüksek" renk="amber" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">{sb('kategori', 'Kategoriye göre (hızlı gidenler)', katOzet.length)}{sb('cek', 'Tüm eksik parçalar', cek.length)}{sb('fiyat', 'Fiyat karşılaştırma', bizde.length)}</div>
        <div className="relative min-w-[12rem] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="inp pl-9" placeholder="Parça, kod, üretici…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="inp w-44" value={arac} onChange={(e) => setArac(e.target.value)}><option value="">Tüm araç markaları</option>{araclar.map((a) => <option key={a} value={a}>{aracAd(a)}</option>)}</select>
        {gor !== 'kategori' && <select className="inp w-48" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k} value={k}>{katAd(k)}</option>)}</select>}
        {gor !== 'fiyat' && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sadeceStokta} onChange={(e) => setSadeceStokta(e.target.checked)} /> Yalnız rakipte stokta olanlar</label>}
      </div>

      {!veri ? <div className="card p-6 text-center text-sm text-slate-500">Yükleniyor…</div>
        : !l.length ? <div className="card"><Bos metin="Pazar taraması henüz veri toplamadı; ilk sonuçlar birkaç dakika içinde gelir." /></div>
        : gor === 'cek' ? (
          <div className="card">
            {cek.length === 0 ? <Bos metin="Bu filtrede eksik parça yok." /> : (
              <div className="max-h-[62vh] overflow-auto">
                <table className="tbl">
                  <thead><tr><th>Parça</th><th>Stok kodu</th><th>Kategori</th><th className="text-right">Pazar puanı</th><th>Sitedeki rozet (elle)</th><th className="text-right">Rakip fiyatı</th><th>Bizde</th><th /></tr></thead>
                  <tbody>{cek.slice(0, 500).map((x) => (
                    <tr key={x.url} className="align-top">
                      <td><a href={x.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{x.ad ?? x.url} <ExternalLink size={11} className="inline" /></a>
                        <div className="text-xs text-slate-500">{x.uretici ?? ''}{x.araclar.length ? ` · ${x.araclar.map(aracAd).join(', ')}` : ''}</div>
                        {omAcik === x.url && <div className="mt-2"><OtomarmaraArama q={x.kod ?? x.ad ?? ''} oto maliyet={izin('maliyet')} /></div>}</td>
                      <td><KodKopya x={x} /></td>
                      <td className="text-sm">{katAd(x.kategori)}</td>
                      <td className="text-right font-semibold">{x.puan.toFixed(1)}<div className="text-[11px] font-normal text-slate-500">{x.gorulme} listede</div></td>
                      <td><TalepGir x={x} kaydet={notKaydet} /></td>
                      <td className="text-right">{x.fiyat ? para(x.fiyat) : '—'}<div className={`text-[11px] ${x.stokta === false ? 'text-red-600' : 'text-emerald-700'}`}>{x.stokta === false ? 'tükendi' : 'stokta'}</div></td>
                      <td className="text-sm">{x.urun_id ? <><UrunLink id={x.urun_id}>{x.bizim_ad ?? 'kart'}</UrunLink><div className="text-[11px] text-amber-700">stok 0</div></> : <span className="text-red-600">yok</span>}</td>
                      <td><button className="btn-ghost whitespace-nowrap py-1 text-xs" onClick={() => setOmAcik(omAcik === x.url ? null : x.url)}>{omAcik === x.url ? 'Kapat' : "Otomarmara'da ara"}</button></td>
                    </tr>))}</tbody>
                </table>
              </div>)}
          </div>
        ) : gor === 'kategori' ? (
          <div className="space-y-2">
            {katOzet.length === 0 && <div className="card"><Bos metin="Bu filtrede eksik kategori yok." /></div>}
            {katOzet.map((g, i) => {
              const oran = g.toplam ? g.bizde / g.toplam : 0; const acik = acikKat === g.kat;
              const kodlar = g.eksikler.map(kodYaz).filter(Boolean);
              return (
                <div key={g.kat} className="card">
                  <div className="flex cursor-pointer flex-wrap items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => setAcikKat(acik ? null : g.kat)}>
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
                        <thead><tr><th>Parça</th><th>Stok kodu</th><th className="text-right">Pazar puanı</th><th>Sitedeki rozet (elle)</th><th className="text-right">Rakip fiyatı</th><th>Bizde</th><th /></tr></thead>
                        <tbody>{g.eksikler.slice(0, 200).map((x) => (
                          <tr key={x.url} className="align-top">
                            <td><a href={x.url} target="_blank" rel="noreferrer" className="hover:underline">{x.ad ?? x.url} <ExternalLink size={11} className="inline" /></a>
                              <div className="text-xs text-slate-500">{x.uretici ?? ''}{x.araclar.length ? ` · ${x.araclar.map(aracAd).join(', ')}` : ''}</div>
                              {omAcik === x.url && <div className="mt-2"><OtomarmaraArama q={x.kod ?? x.ad ?? ''} oto maliyet={izin('maliyet')} /></div>}</td>
                            <td><KodKopya x={x} /></td>
                            <td className="text-right font-semibold">{x.puan.toFixed(1)}<div className="text-[11px] font-normal text-slate-500">{x.gorulme} listede</div></td>
                            <td><TalepGir x={x} kaydet={notKaydet} /></td>
                            <td className="text-right">{x.fiyat ? para(x.fiyat) : '—'}<div className={`text-[11px] ${x.stokta === false ? 'text-red-600' : 'text-emerald-700'}`}>{x.stokta === false ? 'tükendi' : x.stokta ? 'stokta' : ''}</div></td>
                            <td className="text-sm">{x.urun_id ? <><UrunLink id={x.urun_id}>{x.bizim_ad ?? 'kart'}</UrunLink><div className="text-[11px] text-amber-700">stok 0</div></> : <span className="text-red-600">yok</span>}</td>
                            <td><button className="btn-ghost whitespace-nowrap py-1 text-xs" onClick={() => setOmAcik(omAcik === x.url ? null : x.url)}>{omAcik === x.url ? 'Kapat' : "Otomarmara'da ara"}</button></td>
                          </tr>))}</tbody>
                      </table>
                    </div>)}
                </div>);
            })}
          </div>
        ) : (
          <div className="card">
            {bizde.length === 0 ? <Bos metin="Henüz eşleşen ürün yok." /> : (
              <div className="max-h-[62vh] overflow-auto">
                <table className="tbl">
                  <thead><tr><th>Ürün (bizde)</th><th className="text-right">Stok</th><th className="text-right">Dükkân fiyatı</th><th className="text-right">Trendyol fiyatımız</th><th className="text-right">Otoparçasan</th><th className="text-right">Fark</th></tr></thead>
                  <tbody>{[...bizde].sort((a, b) => ((b.bizim_fiyat ?? 0) / (b.fiyat || Infinity)) - ((a.bizim_fiyat ?? 0) / (a.fiyat || Infinity))).slice(0, 500).map((x) => {
                    const t = x.urun_id ? ty.get(x.urun_id) : undefined; const fark = x.fiyat && x.bizim_fiyat ? (x.bizim_fiyat / x.fiyat - 1) * 100 : null;
                    return (
                      <tr key={x.url}>
                        <td><UrunLink id={x.urun_id!}>{x.bizim_ad}</UrunLink><div className="text-xs text-slate-500"><a href={x.url} target="_blank" rel="noreferrer" className="hover:underline">{x.ad} <ExternalLink size={10} className="inline" /></a></div></td>
                        <td className="text-right">{sayi(x.bizim_stok ?? 0)}</td>
                        <td className="text-right">{x.bizim_fiyat ? para(x.bizim_fiyat) : '—'}</td>
                        <td className="text-right">{t?.satis_fiyati ? para(t.satis_fiyati) : <span className="text-slate-400">ilan yok</span>}</td>
                        <td className="text-right font-medium">{x.fiyat ? para(x.fiyat) : '—'}</td>
                        <td className={`text-right font-semibold ${fark === null ? 'text-slate-300' : fark > 5 ? 'text-red-600' : fark < -5 ? 'text-emerald-700' : 'text-slate-600'}`}>{fark === null ? '—' : `${fark > 0 ? '+' : ''}%${fark.toFixed(0)}`}</td>
                      </tr>); })}</tbody>
                </table>
              </div>)}
          </div>
        )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Ürün sayfasındaki "kişi satın aldı / sepetinde / inceledi" rozeti sitenin otomatik programlara kapattığı bir adresten geldiği için toplu çekilmez; parçayı açıp gördüğünüz sayıyı "Sitedeki rozet" kutularına yazarsanız kaydedilir ve liste önce bu sayılara göre sıralanır. Otoparçasan satış adedini sayfanın kendisinde yayınlamaz. Pazar puanı, parçanın araç markası × kategori sayfalarının ilk sayfasında kaç kez ve ne kadar üst sırada listelendiğidir (site "Önerilen" sıralamada çok satan ve stoklu ürünleri öne alır); yüksek puan = çok aranan, hızlı giden parça. Eşleşme üretici kodu ile yapılır (BizimHesap stok kodu ve etiketteki OEM/muadil kodlar); kodu farklı yazılmış ürünler "yok" görünebilir. Rafa almadan önce tedarikçi fiyatını Otomarmara düğmesiyle kontrol edin.</p>
    </div>
  );
}
