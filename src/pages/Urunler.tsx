import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, History, KeyRound, Link2, Pencil, RefreshCw, Tag } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend } from '../lib/backend';
import { gunu, kodNorm, para, parse, sayi, tarih, tarihSaat } from '../lib/format';
import type { Urun } from '../lib/types';
import { Alan, Bos, Kpi, Modal, SayfaBaslik } from '../components/ui';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { kodHaritasi, urunAra } from '../lib/kod';
import { birimKar, netSatis, hareketTutar, stokluMu, kritikAltinda, takipGunu, urunOzetleri } from '../lib/analiz';
import { EtiketModal, type EtiketKalem } from '../components/StokAraclari';
import { Plus, X } from 'lucide-react';
import { UrunLink } from '../components/DetayKart';
import { OtoparcasanLink } from '../components/DisLink';
import { genelArama } from '../lib/arama';
import { omGuvenilir } from '../lib/muadil';
import { onerilenFiyat, sonAlislar } from '../lib/analiz2';
import { tedarikciEnIyi, type TedEn } from '../lib/trendyol';

type Filtre = 'hepsi' | 'fiyat' | 'stoklu' | 'kritik' | 'biten' | 'hareketsiz' | 'eksi' | 'oemsiz' | 'markasiz' | 'barkodsuz' | 'gorselsiz' | 'pasif';
type SiraAlan = 'ad' | 'stok' | 'satis90' | 'son' | 'yeter' | 'fiyat' | 'marj';

export default function Urunler() {
  const { db, izin, calistir, mode } = useStore();
  const yonet = izin('urun'), maliyetGor = izin('maliyet');
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('');
  const [marka, setMarka] = useState('');
  const [depoF, setDepoF] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('hepsi');
  const [sira, setSira] = useState<{ alan: SiraAlan; artan: boolean } | null>(null);
  const [secim, setSecim] = useState<Set<string>>(new Set());
  const [topluKritik, setTopluKritik] = useState('');
  const [topluRaf, setTopluRaf] = useState('');
  const [duzen, setDuzen] = useState<Urun | null>(null);
  const [gecmis, setGecmis] = useState<Urun | null>(null);
  const [etiket, setEtiket] = useState<EtiketKalem[] | null>(null);
  const [kodIce, setKodIce] = useState(false);
  const [gosterilen, setGosterilen] = useState(200);
  // tedarikçilerdeki güncel alış (Otomarmara/Neko gece, Iron eklentiden) — yalnız yönetici
  const [ted, setTed] = useState<Map<string, TedEn>>(new Map());
  useEffect(() => { if (maliyetGor) backend.tedarikciMaliyet().then((l) => setTed(tedarikciEnIyi(l)), () => setTed(new Map())); }, [maliyetGor]);
  const hedefMarj = Number(db.ayarlar.hedef_marj ?? 15) || 15;
  /** Fiyat kontrolü: güncel maliyet = kart/fatura alışı ya da tedarikçideki güncel fiyat (kartı %50'den fazla aşmıyorsa) — hangisi yüksekse */
  const fiyatDurum = (u: Urun) => {
    const bk = birimKar(u, db.ayarlar); const t = ted.get(u.id);
    const tedKullan = !!t && bk.alisNet > 0 && t.fiyat > bk.alisNet * 1.03 && t.fiyat <= bk.alisNet * 1.5;
    const maliyet = tedKullan ? t!.fiyat : bk.alisNet; const net = netSatis(u.satis_fiyati, u.kdv);
    const marj = net > 0 && maliyet > 0 ? ((net - maliyet) / net) * 100 : null;
    const uyari = marj !== null && marj < hedefMarj - 0.5 ? (marj < 0 ? 'zarar' : 'dusuk') : null;
    return { maliyet, marj, uyari, tedKullan, ted: t, oneri: uyari ? onerilenFiyat(u, maliyet, hedefMarj) : null } as const;
  };

  const depolar = aktifDepolar(db);
  const harita = useMemo(() => stokHaritasi(db), [db]);
  const kategoriler = useMemo(() => Array.from(new Set(db.urunler.map((u) => u.kategori).filter(Boolean))).sort() as string[], [db.urunler]);
  const markalar = useMemo(() => Array.from(new Set(db.urunler.filter((u) => u.aktif).map((u) => u.marka).filter(Boolean))).sort((a, b) => a!.localeCompare(b!, 'tr')) as string[], [db.urunler]);
  const kodlar = useMemo(() => kodHaritasi(db), [db]);
  // Otomarmara'dan gelen kodlar yalnız eşleşmesi güvenilir üründe sayılır (şüpheli eşleşmede başka ürünün kodları olabilir)
  const guven = useMemo(() => omGuvenilir(db), [db]);
  const gecerliKodlar = (u: Urun) => (kodlar.get(u.id) ?? []).filter((k) => k.tur !== 'OTOMARMARA' || guven.has(String(u.id)));
  const omVar = useMemo(() => new Set((db.otomarmara_veri ?? []).filter((x) => (x.oemler?.length || x.esdegerler?.length) && guven.has(String(x.urun_id))).map((x) => String(x.urun_id))), [db.otomarmara_veri, guven]);
  const oemYok = (u: Urun) => !(u.etiket ?? '').trim() && !gecerliKodlar(u).length && !omVar.has(String(u.id));
  // "90 gündür satılmayan": son 90 günde satışı yok VE son 90 günde alınmamış (yeni gelen mal henüz satılmamış sayılmaz)
  const sonAlis = useMemo(() => sonAlislar(db), [db]);
  const sinir90 = gunu(new Date(Date.now() - 89 * 864e5));
  const hareketsizMi = (u: Urun) => u.stok > 0 && stokluMu(u) && !(oz.get(u.id)?.satilan) && !((sonAlis.get(u.id)?.tarih ?? '') >= sinir90);
  // son 90 günün satışı: adet, son satış, stok kaç gün yeter
  const d90 = useMemo(() => ({ bas: gunu(new Date(Date.now() - 89 * 864e5)), bit: gunu() }), []);
  const oz = useMemo(() => urunOzetleri(db, d90), [db, d90]);
  const gun90 = useMemo(() => takipGunu(db, d90), [db, d90]);
  /** uyarı yalnız stok tutulan, stokta olan ya da son 90 günde satılan ürünlerde */
  const fiyatUyarili = (u: Urun) => maliyetGor && u.aktif && stokluMu(u) && u.satis_fiyati > 0 && (u.stok > 0 || (oz.get(u.id)?.satilan ?? 0) > 0) && !!fiyatDurum(u).uyari;
  const sb = (u: Urun) => { const o = oz.get(u.id); const s = o?.satilan ?? 0; const hiz = s / Math.max(1, gun90); return { s, son: o?.sonSatis, yeter: hiz > 0 ? Math.max(0, u.stok) / hiz : Infinity }; };

  const liste = useMemo(() => {
    // arama "Ürün Ara" sayfasıyla aynı motor: kod, barkod, OEM (doğrulanmış), Otomarmara eşdeğeri, ad ve araç-model; pasiflerde eski arama
    const aday = !q.trim() ? [...db.urunler].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
      : filtre === 'pasif' ? urunAra(db, q, kodlar, { sadeceAktif: false }).map((x) => x.urun) : genelArama(db, q, 5000).map((x) => x.u);
    const [dId, dTur] = depoF.split(':');
    const l = aday.filter((u) => {
      if (filtre === 'pasif' ? u.aktif : !u.aktif) return false;
      if (kat && u.kategori !== kat) return false;
      if (marka && u.marka !== marka) return false;
      if (dId) { const m = harita.get(u.id); const bu = m?.get(dId) ?? 0; if (bu <= 0) return false; if (dTur === 'yalniz' && depolar.some((d) => d.id !== dId && (m?.get(d.id) ?? 0) > 0)) return false; }
      switch (filtre) {
        case 'fiyat': return fiyatUyarili(u);
        case 'stoklu': return u.stok > 0;
        case 'biten': return u.stok <= 0 && stokluMu(u);
        case 'kritik': return kritikAltinda(u);
        case 'hareketsiz': return hareketsizMi(u);
        case 'eksi': return u.stok < 0;
        case 'oemsiz': return stokluMu(u) && oemYok(u);
        case 'markasiz': return stokluMu(u) && !(u.marka ?? '').trim();
        case 'barkodsuz': return stokluMu(u) && !(u.barkod ?? '').trim();
        case 'gorselsiz': return u.stok > 0 && u.gorsel_var === false;
        default: return true;
      }
    });
    if (!sira) return l;
    const deger = (u: Urun): number | string => { switch (sira.alan) {
      case 'ad': return u.ad; case 'stok': return u.stok; case 'satis90': return sb(u).s; case 'son': return sb(u).son ?? '';
      case 'yeter': { const y = sb(u).yeter; return Number.isFinite(y) ? y : 1e9; } case 'fiyat': return u.satis_fiyati; case 'marj': { const m = fiyatDurum(u).marj; return m === null ? -1e9 : m; } } };
    const k = sira.artan ? 1 : -1;
    return [...l].sort((a, b) => { const x = deger(a), y = deger(b); return (typeof x === 'string' ? x.localeCompare(y as string, 'tr') : x - (y as number)) * k; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, q, kodlar, filtre, kat, marka, depoF, harita, oz, sira, omVar, sonAlis, ted]);

  const aktifler = db.urunler.filter((u) => u.aktif);
  const stoklu = aktifler.filter((u) => u.stok > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hareketsiz = useMemo(() => aktifler.filter(hareketsizMi), [aktifler, oz, sonAlis]);
  const seciliUrunler = liste.filter((u) => secim.has(u.id));
  const fiyatUyarilar = useMemo(() => aktifler.filter(fiyatUyarili), [db, ted, oz]); // eslint-disable-line react-hooks/exhaustive-deps
  const say = (f: Filtre) => f === 'fiyat' ? fiyatUyarilar.length : f === 'oemsiz' ? aktifler.filter((u) => stokluMu(u) && oemYok(u)).length : f === 'markasiz' ? aktifler.filter((u) => stokluMu(u) && !(u.marka ?? '').trim()).length : f === 'barkodsuz' ? aktifler.filter((u) => stokluMu(u) && !(u.barkod ?? '').trim()).length : f === 'gorselsiz' ? aktifler.filter((u) => u.stok > 0 && u.gorsel_var === false).length : f === 'eksi' ? aktifler.filter((u) => u.stok < 0).length : f === 'hareketsiz' ? hareketsiz.length : null;
  const filtreAd: [Filtre, string][] = [['hepsi', 'Aktif ürünler'], ...(maliyetGor ? [['fiyat', `Fiyat uyarısı (marj %${hedefMarj} altı)`] as [Filtre, string]] : []), ['stoklu', 'Stoktakiler'], ['biten', 'Stoğu bitenler'], ['kritik', 'Kritik stok'], ['hareketsiz', '90 gündür satılmayan (stokta, yeni alınmamış)'], ['eksi', 'Eksi stok'], ['oemsiz', 'OEM/muadil kodu yok'], ['markasiz', 'Markası yok'], ['barkodsuz', 'Barkodu yok'], ['gorselsiz', 'Görseli yok (stokta)'], ['pasif', 'Pasif ürünler']];

  const csvIndir = () => {
    const satir = (a: (string | number | null | undefined)[]) => a.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';');
    const csv = [satir(['Kod', 'Barkod', 'Ad', 'Marka', 'Kategori', 'Birim', 'Alış', 'Satış', 'Marj % (KDV hariç)', 'Güncel maliyet', 'Önerilen satış', 'KDV', 'Stok', ...depolar.map((d) => d.ad), 'Kritik', 'Raf', '90 gün satış', 'Son satış', 'Kaç gün yeter']),
      ...liste.map((u) => { const x = sb(u); return satir([u.kod, u.barkod, u.ad, u.marka, u.kategori, u.birim, u.alis_fiyati, u.satis_fiyati, ...(() => { const f = fiyatDurum(u); return [f.marj === null ? '' : f.marj.toFixed(1), f.maliyet ? f.maliyet.toFixed(2) : '', f.oneri ?? '']; })(), u.kdv, u.stok, ...depolar.map((d) => harita.get(u.id)?.get(d.id) ?? 0), u.kritik_stok, u.raf, x.s, x.son ? tarih(x.son) : '', Number.isFinite(x.yeter) ? Math.round(x.yeter) : '']); })].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'urunler.csv'; a.click();
  };
  const topluGuncelle = (patch: Partial<Urun>, mesaj: string) => calistir(async () => { for (const u of seciliUrunler) await backend.update<Urun>('urunler', u.id, patch); }, `${seciliUrunler.length} üründe ${mesaj}`);
  const omIste = () => calistir(() => backend.omIste(seciliUrunler.slice(0, 100).map((u) => u.id)), `${Math.min(100, seciliUrunler.length)} ürün Otomarmara'ya soruldu (öncelikli işlenir, dakikada 12 ürüne kadar)`);
  const secDegis = (id: string) => { const s = new Set(secim); if (s.has(id)) s.delete(id); else s.add(id); setSecim(s); };
  const gorunen = liste.slice(0, gosterilen);
  const hepsiSecili = gorunen.length > 0 && gorunen.every((u) => secim.has(u.id));
  const Baslik = ({ alan, children, sag }: { alan: SiraAlan; children: React.ReactNode; sag?: boolean }) => (
    <th className={`whitespace-nowrap ${sag ? 'text-right' : ''}`}><button className="inline-flex items-center gap-0.5 uppercase hover:text-slate-900 dark:hover:text-white" onClick={() => setSira(sira?.alan === alan ? (sira.artan ? { alan, artan: false } : null) : { alan, artan: alan === 'ad' || alan === 'yeter' || alan === 'son' })}>
      {children}{sira?.alan === alan ? (sira.artan ? ' ↑' : ' ↓') : ''}</button></th>
  );

  return (
    <div>
      <SayfaBaslik baslik="Ürünler & Stok" alt={`${sayi(aktifler.length)} aktif ürün · BizimHesap'tan birkaç dakikada bir güncellenir`}>
        <button className="btn-ghost" onClick={() => setEtiket([])}><Tag size={16} /> Etiket yazdır</button>
        {yonet && <button className="btn-ghost" onClick={() => setKodIce(true)}><KeyRound size={16} /> OEM kodları yükle</button>}
        {maliyetGor && <button className="btn-ghost" onClick={csvIndir}><Download size={16} /> Excel (CSV)</button>}
      </SayfaBaslik>

      {maliyetGor && fiyatUyarilar.length > 0 && filtre !== 'fiyat' && (
        <button className="mb-4 flex w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" onClick={() => { setFiltre('fiyat'); setSira({ alan: 'marj', artan: true }); setSecim(new Set()); }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span><b>Fiyat uyarısı: {sayi(fiyatUyarilar.length)} üründe satış fiyatı güncel maliyete göre düşük</b>{(() => { const z = fiyatUyarilar.filter((u) => fiyatDurum(u).uyari === 'zarar').length; return z ? <> — <b className="text-red-700 dark:text-red-300">{sayi(z)} tanesi zararına</b></> : null; })()}. Marj %{hedefMarj} hedefin altında; önerilen satış fiyatlarını görmek için tıklayın, BizimHesap'ta satış fiyatını güncelleyin.</span>
        </button>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button className="text-left" onClick={() => setFiltre('stoklu')}><Kpi etiket="Stoktaki ürün çeşidi" deger={sayi(stoklu.length)} alt={`${sayi(stoklu.reduce((t, u) => t + u.stok, 0))} adet`} /></button>
        <Kpi etiket="Stoğun satış değeri (KDV dahil)" deger={para(stoklu.reduce((t, u) => t + u.stok * u.satis_fiyati, 0))} renk="blue" />
        {maliyetGor ? <Kpi etiket={`Stok maliyeti (${db.ayarlar.alis_kdv_haric ? 'KDV hariç' : 'KDV dahil'})`} deger={para(stoklu.reduce((t, u) => t + u.stok * u.alis_fiyati, 0))} renk="green" /> : <Kpi etiket="Kategori" deger={sayi(kategoriler.length)} />}
        <button className="text-left" onClick={() => setFiltre('biten')}><Kpi etiket="Stoğu biten" deger={sayi(aktifler.filter((u) => u.stok <= 0 && stokluMu(u)).length)} renk="amber" alt="İşçilik/hizmet hariç · listelemek için tıklayın" /></button>
        <button className="text-left" onClick={() => { setFiltre('hareketsiz'); setSira({ alan: 'stok', artan: false }); }}><Kpi etiket="90 gündür satılmayan" deger={sayi(hareketsiz.length)} renk="red"
          alt={maliyetGor ? `Bağlı para ${para(hareketsiz.reduce((t, u) => t + u.stok * u.alis_fiyati, 0))} · son 90 günde alınanlar hariç` : 'Stokta duran · tıklayın'} /></button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-sm" placeholder="Ad, kod, barkod, marka, raf veya OEM / muadil kodu…" value={q} onChange={(e) => { setQ(e.target.value); setGosterilen(200); }} autoFocus />
          <select className="inp w-40" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k}>{k}</option>)}</select>
          <select className="inp w-36" value={marka} onChange={(e) => setMarka(e.target.value)}><option value="">Tüm markalar</option>{markalar.map((k) => <option key={k}>{k}</option>)}</select>
          {depolar.length > 1 && <select className="inp w-44" value={depoF} onChange={(e) => setDepoF(e.target.value)}><option value="">Tüm depolar</option>{depolar.map((d) => [<option key={d.id} value={`${d.id}:var`}>{d.ad}'da stoklu</option>, <option key={d.id + 'y'} value={`${d.id}:yalniz`}>Yalnız {d.ad}'da</option>])}</select>}
          <select className="inp w-52" value={filtre} onChange={(e) => { const f = e.target.value as Filtre; setFiltre(f); setSecim(new Set()); if (f === 'gorselsiz') setSira({ alan: 'satis90', artan: false }); }}>{filtreAd.map(([f, ad]) => { const n = say(f); return <option key={f} value={f}>{ad}{n !== null ? ` (${sayi(n)})` : ''}</option>; })}</select>
          <span className="ml-auto text-xs text-slate-500">{sayi(liste.length)} sonuç</span>
        </div>
        {secim.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-sky-50 p-2.5 text-sm dark:border-slate-800 dark:bg-sky-500/10">
            <b>{sayi(secim.size)} ürün seçili</b>
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEtiket(seciliUrunler.map((u) => ({ urun: u, adet: 1 })))}><Tag size={14} /> Etiket yazdır</button>
            {yonet && <>
              <span className="ml-2 flex items-center gap-1">Kritik <input className="inp w-16 py-1 text-right" value={topluKritik} onChange={(e) => setTopluKritik(e.target.value)} placeholder="0" />
                <button className="btn-ghost px-2 py-1 text-xs" disabled={topluKritik === ''} onClick={() => topluGuncelle({ kritik_stok: parse(topluKritik) }, 'kritik seviye güncellendi')}>Uygula</button></span>
              <span className="flex items-center gap-1">Raf <input className="inp w-24 py-1" value={topluRaf} onChange={(e) => setTopluRaf(e.target.value)} placeholder="ör. A-3" />
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => topluGuncelle({ raf: topluRaf.trim() || null }, topluRaf.trim() ? 'raf yazıldı' : 'raf silindi')}>Uygula</button></span>
              {mode === 'bulut' && <button className="btn-ghost px-2 py-1 text-xs" onClick={omIste} title="En fazla 100 ürün; sunucu öncelikli olarak dakikada 12 ürüne kadar işler"><RefreshCw size={14} /> OEM/muadil Otomarmara'dan iste</button>}
            </>}
            <button className="ml-auto text-xs text-slate-500 hover:underline" onClick={() => setSecim(new Set())}>Seçimi temizle</button>
          </div>
        )}
        <div className="max-h-[65vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Ürün bulunamadı." /> : <>
            {/* telefon görünümü: kart listesi */}
            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {gorunen.map((u) => {
                const x = sb(u);
                return (
                  <div key={u.id} className={`flex gap-3 p-3 ${secim.has(u.id) ? 'bg-sky-50/60 dark:bg-sky-500/5' : ''}`}>
                    <input type="checkbox" className="mt-1" checked={secim.has(u.id)} onChange={() => secDegis(u.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-snug"><UrunLink id={u.id}>{u.ad}</UrunLink></div>
                      <div className="text-xs text-slate-500">{[u.kod, u.marka, u.raf && `raf ${u.raf}`].filter(Boolean).join(' · ')}</div>
                      {depolar.length > 1 && <div className="mt-1 flex flex-wrap gap-1 text-[11px]">{depolar.map((d) => { const m = harita.get(u.id)?.get(d.id) ?? 0; return <span key={d.id} className={`rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800 ${m <= 0 ? 'text-slate-400' : ''}`}>{d.ad.replace(/ DEPO(SU)?$/i, '')}: <b>{sayi(m)}</b></span>; })}</div>}
                      <div className="mt-1 text-[11px] text-slate-500">90 gün: {x.s ? <b>{sayi(x.s)}</b> : '—'}{u.stok > 0 && Number.isFinite(x.yeter) ? ` · ${x.yeter > 365 ? '1 yıl+' : `${Math.round(x.yeter)} gün`} yeter` : ''}{maliyetGor ? (() => { const f = fiyatDurum(u); return f.marj === null ? '' : <span className={f.marj < 0 ? ' text-red-600' : f.marj < hedefMarj - 0.5 ? ' text-amber-600' : ''}> · marj %{f.marj.toFixed(0)}{f.oneri ? ` · öneri ${para(f.oneri)}` : ''}</span>; })() : ''}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="font-semibold">{para(u.satis_fiyati)}</div>
                      <span className={`rozet whitespace-nowrap ${u.stok <= 0 ? 'bg-red-100 text-red-700' : kritikAltinda(u) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{sayi(u.stok)} {u.birim}</span>
                      <div className="flex gap-0.5 text-slate-400">
                        <button title="Etiket" className="rounded p-1.5" onClick={() => setEtiket([{ urun: u, adet: 1 }])}><Tag size={16} /></button>
                        <button title="Geçmiş" className="rounded p-1.5" onClick={() => setGecmis(u)}><History size={16} /></button>
                        {yonet && <button title="Düzenle" className="rounded p-1.5" onClick={() => setDuzen(u)}><Pencil size={16} /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <table className="tbl hidden md:table">
              <thead><tr><th className="w-8"><input type="checkbox" checked={hepsiSecili} title="Görünenlerin hepsini seç" onChange={() => { const s = new Set(secim); gorunen.forEach((u) => (hepsiSecili ? s.delete(u.id) : s.add(u.id))); setSecim(s); }} /></th>
                <Baslik alan="ad">Ürün</Baslik><th>Marka</th><th>Raf</th>{maliyetGor && <th className="text-right">Alış</th>}<Baslik alan="fiyat" sag>Satış</Baslik>{maliyetGor && <Baslik alan="marj" sag>Marj</Baslik>}
                {depolar.length > 1 && depolar.map((d) => <th key={d.id} className="text-right">{d.ad}</th>)}<Baslik alan="stok" sag>{depolar.length > 1 ? 'Toplam' : 'Stok'}</Baslik>
                <Baslik alan="satis90" sag>90 gün</Baslik><Baslik alan="son" sag>Son satış</Baslik><Baslik alan="yeter" sag>Yeter</Baslik><th className="w-24" /></tr></thead>
              <tbody>
                {gorunen.map((u) => {
                  const bk = birimKar(u, db.ayarlar); const x = sb(u); const sonGun = x.son ? Math.floor((Date.now() - new Date(x.son).getTime()) / 864e5) : null;
                  return (
                    <tr key={u.id} className={secim.has(u.id) ? 'bg-sky-50/60 dark:bg-sky-500/5' : ''}>
                      <td><input type="checkbox" checked={secim.has(u.id)} onChange={() => secDegis(u.id)} /></td>
                      <td className="min-w-[17rem]"><div className="flex items-center gap-1 font-medium"><UrunLink id={u.id}>{u.ad}</UrunLink>{u.bh_id && <span title="BizimHesap'tan eşitleniyor"><Link2 size={13} className="text-sky-500" /></span>}</div><div className="text-xs text-slate-500" title={u.barkod ? `Barkod: ${u.barkod}` : undefined}>{u.kod && <span className="mr-1.5 font-mono">{u.kod}</span>}{u.kategori} <OtoparcasanLink u={u} kisa />{(() => { const kk = gecerliKodlar(u); return kk.length ? <span className="ml-1.5 rozet bg-sky-50 text-sky-700" title={kk.map((k) => k.kod).join(', ')}>{kk.length} OEM/muadil</span> : null; })()}</div></td>
                      <td className="whitespace-nowrap">{u.marka}</td><td className="whitespace-nowrap">{u.raf}</td>
                      {maliyetGor && <td className="text-right">{u.alis_fiyati ? <>{para(u.alis_fiyati)}{u.kart_alis ? <div className="text-[10px] text-sky-700" title={`Kartta ${para(u.kart_alis)} yazıyor; ${u.alis_fatura?.tarih} tarihli faturanın net fiyatı kullanılıyor`}>fatura fiyatı</div> : null}</> : <span className="text-slate-300">—</span>}</td>}<td className="whitespace-nowrap text-right font-medium">{para(u.satis_fiyati)}{(() => { if (!maliyetGor) return null; const f = fiyatDurum(u); return f.oneri ? <div className={`text-[11px] font-normal ${f.uyari === 'zarar' ? 'text-red-600' : 'text-amber-600'}`} title={`Güncel maliyet ${para(f.maliyet)} (KDV hariç); %${hedefMarj} marj için önerilen satış fiyatı`}>öneri {para(f.oneri)}</div> : null; })()}</td>
                      {maliyetGor && (() => { const f = fiyatDurum(u); return <td className={`text-right ${f.marj === null ? 'text-slate-300' : f.marj < 0 ? 'font-semibold text-red-600' : f.marj < hedefMarj - 0.5 ? 'text-amber-600' : 'text-slate-500'}`} title={f.tedKullan ? `Tedarikçide güncel alış ${para(f.ted!.fiyat)} (kart ${para(bk.alisNet)}) — marj buna göre` : undefined}>{f.marj === null ? '—' : `%${f.marj.toFixed(0)}`}{f.tedKullan && <div className="text-[10px] text-red-500">tedarikçi zamlı</div>}</td>; })()}
                      {depolar.length > 1 && depolar.map((d) => { const m = harita.get(u.id)?.get(d.id) ?? 0; return <td key={d.id} className={`text-right ${m < 0 ? 'text-red-600' : m === 0 ? 'text-slate-300' : ''}`}>{sayi(m)}</td>; })}
                      <td className="whitespace-nowrap text-right"><span className={`rozet whitespace-nowrap ${u.stok <= 0 ? 'bg-red-100 text-red-700' : kritikAltinda(u) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{sayi(u.stok)} {u.birim}</span></td>
                      <td className="text-right">{x.s ? sayi(x.s) : <span className="text-slate-300">—</span>}</td>
                      <td className="whitespace-nowrap text-right text-xs text-slate-500" title={x.son ? tarih(x.son) : '90 gündür satış yok'}>{sonGun === null ? <span className="text-slate-300">—</span> : sonGun === 0 ? 'bugün' : `${sonGun} gün önce`}</td>
                      <td className={`text-right text-xs ${u.stok > 0 && Number.isFinite(x.yeter) && x.yeter < 7 ? 'text-red-600' : u.stok > 0 && !Number.isFinite(x.yeter) ? 'text-slate-300' : 'text-slate-500'}`}>{u.stok <= 0 ? '—' : Number.isFinite(x.yeter) ? (x.yeter > 365 ? '1 yıl+' : `${Math.round(x.yeter)} gün`) : 'satılmıyor'}</td>
                      <td>
                        <div className="flex justify-end gap-1 text-slate-400">
                          <button title="Etiket yazdır" className="rounded p-1 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800" onClick={() => setEtiket([{ urun: u, adet: 1 }])}><Tag size={16} /></button>
                          <button title="Hareket ve fiyat geçmişi" className="rounded p-1 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800" onClick={() => setGecmis(u)}><History size={16} /></button>
                          {yonet && <button title="Kritik stok, raf, OEM kodları" className="rounded p-1 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800" onClick={() => setDuzen(u)}><Pencil size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>}
          {liste.length > gosterilen && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGosterilen((g) => g + 300)}>Daha fazla göster ({liste.length - gosterilen} ürün daha)</button></div>}
        </div>
      </div>

      {duzen && <UrunDuzen u={duzen} kapat={() => setDuzen(null)} />}
      {gecmis && <UrunGecmis u={gecmis} kapat={() => setGecmis(null)} />}
      {etiket && <EtiketModal baslangic={etiket} kapat={() => setEtiket(null)} />}
      <KodIceAktar acik={kodIce} kapat={() => setKodIce(false)} />
    </div>
  );
}

/** Yalnızca programa ait alanlar: kritik stok ve raf (ad, fiyat, stok BizimHesap'tan gelir) */
function UrunDuzen({ u, kapat }: { u: Urun; kapat: () => void }) {
  const { calistir } = useStore();
  const [kritik, setKritik] = useState(String(u.kritik_stok || ''));
  const [raf, setRaf] = useState(u.raf ?? '');
  const kaydet = async () => {
    const ok = await calistir(() => backend.update<Urun>('urunler', u.id, { kritik_stok: parse(kritik), raf: raf.trim() || null }), 'Kaydedildi');
    if (ok !== undefined) kapat();
  };
  return (
    <Modal acik kapat={kapat} baslik={u.ad} genis="lg" alt={<><button className="btn-ghost" onClick={kapat}>Vazgeç</button><button className="btn-primary" onClick={kaydet}>Kaydet</button></>}>
      <div className="mb-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">Ad, kod, barkod, fiyat ve stok BizimHesap'tan gelir; onları BizimHesap'ta değiştirin. Buradaki alanlar sadece bu programda tutulur.</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Alan etiket="Kritik stok seviyesi"><input className="inp" autoFocus value={kritik} onChange={(e) => setKritik(e.target.value)} placeholder="ör. 3" /></Alan>
        <Alan etiket="Raf / konum"><input className="inp" value={raf} onChange={(e) => setRaf(e.target.value)} /></Alan>
      </div>
      <KodYonetimi urunId={u.id} />
    </Modal>
  );
}

function UrunGecmis({ u, kapat }: { u: Urun; kapat: () => void }) {
  const { db, izin } = useStore();
  const h = db.hareketler.filter((x) => x.urun_id === u.id).sort((p, r) => r.tarih.localeCompare(p.tarih));
  const f = db.fiyat_gecmisi.filter((x) => x.urun_id === u.id);
  const maliyetGor = izin('maliyet');
  return (
    <Modal acik kapat={kapat} baslik={`Geçmiş — ${u.ad}`} genis="lg">
      <h4 className="mb-2 text-sm font-semibold">Satış / alış hareketleri</h4>
      {h.length === 0 ? <Bos metin="Takip başladığından beri hareket yok." /> : (
        <div className="max-h-72 overflow-auto"><table className="tbl"><thead><tr><th>Tarih</th><th>Tür</th><th className="text-right">Miktar</th><th className="text-right">Stok</th><th className="text-right">Tutar</th></tr></thead>
          <tbody>{h.map((x) => <tr key={x.id} className={x.yok_say ? 'opacity-40' : ''}><td>{tarihSaat(x.tarih)}</td><td>{x.tur === 'satis' ? 'Satış' : 'Alış'}{x.yok_say ? ' (hesap dışı)' : ''}</td>
            <td className="text-right">{x.tur === 'satis' ? '−' : '+'}{sayi(x.miktar)}</td><td className="text-right text-slate-500">{x.onceki != null ? `${sayi(x.onceki)} → ${sayi(x.sonraki ?? 0)}` : ''}</td>
            <td className="text-right">{x.tur === 'satis' ? para(hareketTutar(x, db.ayarlar).ciro) : maliyetGor ? para(x.miktar * x.alis_fiyati) : ''}</td></tr>)}</tbody></table></div>
      )}
      {maliyetGor && <>
        <h4 className="mb-2 mt-5 text-sm font-semibold">Fiyat değişimleri</h4>
        {f.length === 0 ? <Bos metin="Takip başladığından beri fiyat değişmedi." /> : (
          <table className="tbl"><thead><tr><th>Tarih</th><th className="text-right">Alış</th><th className="text-right">Satış</th></tr></thead>
            <tbody>{f.map((x) => <tr key={x.id}><td>{tarihSaat(x.tarih)}</td><td className="text-right">{x.alis_eski !== x.alis_yeni ? <>{para(x.alis_eski)} → <b>{para(x.alis_yeni)}</b></> : para(x.alis_yeni)}</td>
              <td className="text-right">{x.satis_eski !== x.satis_yeni ? <>{para(x.satis_eski)} → <b>{para(x.satis_yeni)}</b></> : para(x.satis_yeni)}</td></tr>)}</tbody></table>
        )}
      </>}
    </Modal>
  );
}

/** Ürün kartında OEM / muadil kodlar (anında kaydedilir; BizimHesap eşitlemesi bunlara dokunmaz) */
function KodYonetimi({ urunId }: { urunId: string }) {
  const { db, calistir } = useStore();
  const [kod, setKod] = useState('');
  const [tur, setTur] = useState<'OEM' | 'Muadil'>('OEM');
  // Otomarmara'dan gelen kodlar servis tarafından yönetilir (silinse de yeniden yazılır): burada yalnız sayısı gösterilir
  const tum = db.urun_kodlari.filter((k) => k.urun_id === urunId);
  const liste = tum.filter((k) => k.tur !== 'OTOMARMARA'); const omSay = tum.length - liste.length;
  const ekle = async () => {
    const parcalar = kod.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!parcalar.length) return;
    for (const p of parcalar) {
      if (tum.some((k) => kodNorm(k.kod) === kodNorm(p))) continue;
      await backend.insert('urun_kodlari', { urun_id: urunId, kod: p, tur });
    }
    await calistir(async () => true, parcalar.length > 1 ? `${parcalar.length} kod eklendi` : 'Kod eklendi');
    setKod('');
  };
  return (
    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><KeyRound size={15} /> OEM / muadil kodlar</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {liste.length === 0 && <span className="text-xs text-slate-400">Elle eklenmiş kod yok. Ürün Ara sayfasında bu kodlarla da arama yapılabilir.</span>}
        {omSay > 0 && <span className="text-xs text-slate-500">+ Otomarmara'dan gelen {omSay} OEM kodu (ürün kartındaki Otomarmara bölümünde)</span>}
        {liste.map((k) => (
          <span key={k.id} className={`rozet gap-1 py-1 ${k.tur === 'Muadil' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
            <span className="opacity-60">{k.tur}</span> {k.kod}
            <button className="opacity-60 hover:opacity-100" title="Sil" onClick={() => calistir(() => backend.remove('urun_kodlari', k.id), 'Kod silindi')}><X size={12} /></button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ekle(); }}>
        <select className="inp w-28" value={tur} onChange={(e) => setTur(e.target.value as 'OEM' | 'Muadil')}><option>OEM</option><option>Muadil</option></select>
        <input className="inp" placeholder="Kod yazın (virgülle birden fazla: 4246.R1, 1611186880)" value={kod} onChange={(e) => setKod(e.target.value)} />
        <button className="btn-ghost shrink-0" type="submit"><Plus size={16} /> Ekle</button>
      </form>
    </div>
  );
}

/** Excel'den yapıştırarak toplu OEM/muadil kod yükleme */
function KodIceAktar({ acik, kapat }: { acik: boolean; kapat: () => void }) {
  const { calistir } = useStore();
  const [metin, setMetin] = useState('');
  const [tur, setTur] = useState<'OEM' | 'Muadil'>('OEM');
  const [bekle, setBekle] = useState(false);
  const satirlar = metin.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const [anahtar, ...geri] = s.split(/\t|;/);
    return { anahtar: (anahtar ?? '').replace(/^"|"$/g, '').trim(), kodlar: geri.join(',').split(/[,|/]/).map((x) => x.replace(/^"|"$/g, '').trim()).filter(Boolean), tur };
  }).filter((r) => r.anahtar && r.kodlar.length && !/^(barkod|kod|stok)/i.test(r.anahtar));
  const yukle = async () => {
    setBekle(true);
    const r = await calistir(() => backend.urunKodlariYukle(satirlar));
    setBekle(false);
    if (r && r !== true) { toast(`${r.eklenen} kod eklendi${r.bulunamayan ? `, ${r.bulunamayan} satırın ürünü bulunamadı` : ''}`); setMetin(''); kapat(); }
  };
  return (
    <Modal acik={acik} kapat={kapat} baslik="OEM / muadil kodları toplu yükle" genis="lg"
      alt={<><button className="btn-ghost" onClick={kapat}>Vazgeç</button><button className="btn-primary" disabled={!satirlar.length || bekle} onClick={yukle}>{bekle ? 'Yükleniyor…' : `${satirlar.length} ürüne kod ekle`}</button></>}>
      <p className="mb-2 text-sm text-slate-500">Excel'den iki sütun kopyalayıp yapıştırın: <b>barkod veya stok kodu</b> ve <b>kodlar</b> (birden fazla kod virgülle ayrılabilir).</p>
      <code className="mb-3 block rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">2472626667741 ; 4246.R1, 1611186880<br />MYS-PS9830305 ; G16736, 335808</code>
      <div className="mb-2 flex items-center gap-2 text-sm"><span className="text-slate-500">Kod türü:</span>
        <select className="inp w-32" value={tur} onChange={(e) => setTur(e.target.value as 'OEM' | 'Muadil')}><option>OEM</option><option>Muadil</option></select>
      </div>
      <textarea className="inp h-56 font-mono text-xs" value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={'2472626667741\t4246.R1, 1611186880'} />
      <p className="mt-2 text-xs text-slate-500">Aynı ürüne aynı kod iki kez eklenmez. Boşluk, nokta ve tire farkları aynı kod sayılır.</p>
    </Modal>
  );
}
