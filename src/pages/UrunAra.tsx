import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend, type OmAramaYanit, type OmDetayYanit } from '../lib/backend';
import { para, sayi, tarihSaat } from '../lib/format';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { birimKar } from '../lib/analiz';
import { muadilBulucu, depoKisa } from '../lib/muadil';
import { ESLESME_AD, dizin, genelArama, koddanBizdeki, type AramaSatiri } from '../lib/arama';
import { detayAc } from '../components/DetayKart';
import type { Urun } from '../lib/types';

const TUR_RENK: Record<AramaSatiri['tur'], string> = {
  kod: 'bg-marka-100 text-marka-700', barkod: 'bg-marka-100 text-marka-700', oem: 'bg-sky-100 text-sky-700',
  esdeger: 'bg-orange-100 text-orange-700', kismi: 'bg-slate-100 text-slate-600', metin: 'bg-slate-100 text-slate-600',
};

/** Ürün Ara: stok kodu, barkod, OEM, Otomarmara eşdeğer kodu, ad ve araç-model ile arama; muadiller ve Otomarmara canlı arama */
export default function UrunAra() {
  const { db, izin, mode } = useStore(); const maliyet = izin('maliyet');
  const [yazi, setYazi] = useState(''); const [q, setQ] = useState('');
  const [stokta, setStokta] = useState(false); const [depo, setDepo] = useState('');
  const [goster, setGoster] = useState(30);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => { setQ(yazi); setGoster(30); }, 200); return () => clearTimeout(t); }, [yazi]);
  // arama dizini sayfa açılır açılmaz arka planda hazırlansın (ilk harfte beklenmesin)
  useEffect(() => { const t = setTimeout(() => dizin(db), 30); return () => clearTimeout(t); }, [db]);

  const depolar = aktifDepolar(db);
  const harita = useMemo(() => stokHaritasi(db), [db]);
  const depoStok = (u: Urun, id: string) => harita.get(u.id)?.get(id) ?? 0;
  const tum = useMemo(() => genelArama(db, q, 300), [db, q]);
  const liste = tum.filter((x) => (!stokta || (depo ? depoStok(x.u, depo) > 0 : x.u.stok > 0)));
  const kodGibi = /\d/.test(q) && q.replace(/\s/g, '').length >= 4;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="card space-y-3 p-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={ref} autoFocus className="inp py-3 pl-10 pr-10 text-base" placeholder="Stok kodu, barkod, OEM / eşdeğer kodu ya da “megane 3 balata”" value={yazi}
            onChange={(e) => setYazi(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setYazi(''); }} enterKeyHint="search" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          {yazi && <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-600" onClick={() => { setYazi(''); ref.current?.focus(); }} aria-label="Temizle"><X size={18} /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={stokta} onChange={(e) => setStokta(e.target.checked)} /> Sadece stokta olanlar</label>
          {depolar.length > 1 && <select className="inp w-auto py-1 text-sm" value={depo} onChange={(e) => setDepo(e.target.value)}>
            <option value="">Tüm depolar</option>{depolar.map((d) => <option key={d.id} value={d.id}>{depoKisa(d.ad)}</option>)}</select>}
          {q && <span className="ml-auto text-xs text-slate-500">{liste.length} ürün</span>}
        </div>
      </div>

      {!q && <div className="card p-4 text-sm text-slate-600 dark:text-slate-300">
        <p className="mb-2 font-medium">Neyle arayabilirsiniz?</p>
        <ul className="list-disc space-y-1 pl-5 text-slate-500">
          <li><b>Stok kodu / barkod:</b> BOS-0241140537 ya da barkodu okutun</li>
          <li><b>OEM kodu:</b> orijinal parça numarası (boşluk, nokta, tire fark etmez)</li>
          <li><b>Başka markanın kodu:</b> Otomarmara eşdeğer listesinde geçiyorsa bizdeki karşılığı bulunur</li>
          <li><b>Ad ve araç:</b> “megane 3 balata”, “egea yağ filtresi”, “w205 amortisör”</li>
          <li>Bizde bulunamayan kodu <b>Otomarmara'da</b> da arayabilirsiniz (aşağıda çıkar)</li>
        </ul>
      </div>}

      {q && liste.length === 0 && <div className="card p-4 text-sm text-slate-500">Bizde “{q}” ile eşleşen {stokta ? 'stoklu ' : ''}ürün bulunamadı.</div>}
      {liste.length > 0 && <div className="space-y-2">
        {liste.slice(0, goster).map((x) => <SonucKart key={x.u.id} x={x} maliyet={maliyet} depolar={depolar} depoStok={depoStok} />)}
        {liste.length > goster && <button className="btn-ghost w-full" onClick={() => setGoster((g) => g + 40)}>Daha fazla göster ({liste.length - goster})</button>}
      </div>}

      {q && mode === 'bulut' && <OtomarmaraArama q={q} oto={kodGibi && tum.length === 0} maliyet={maliyet} />}
    </div>
  );
}

function SonucKart({ x, maliyet, depolar, depoStok }: { x: AramaSatiri; maliyet: boolean; depolar: { id: string; ad: string }[]; depoStok: (u: Urun, d: string) => number }) {
  const { db } = useStore(); const u = x.u; const [ac, setAc] = useState(false);
  const muadil = useMemo(() => muadilBulucu(db)(u), [db, u]);
  const stoktaMuadil = muadil.filter((m) => m.stok > 0);
  const bk = maliyet ? birimKar(u, db.ayarlar) : null;
  return (
    <div className="card p-3">
      <div className="flex items-start gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => detayAc({ tur: 'urun', id: u.id })}>
          <div className="font-medium leading-snug hover:text-marka-600">{u.ad}</div>
          <div className="mt-0.5 text-xs text-slate-500">{[u.kod, u.marka, u.kategori, u.raf && `Raf ${u.raf}`].filter(Boolean).join(' · ')}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`rozet ${TUR_RENK[x.tur]}`}>{ESLESME_AD[x.tur]}{x.etiket ? `: ${x.etiket}` : ''}</span>
          </div>
        </button>
        <div className="shrink-0 text-right">
          <div className="font-semibold">{para(u.satis_fiyati)}</div>
          {bk && <div className="text-[11px] text-slate-500">alış {para(bk.alisNet)} · %{bk.marj.toFixed(0)}</div>}
          <div className={`text-sm font-medium ${u.stok > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>Stok {sayi(u.stok)}</div>
          {depolar.length > 1 && <div className="text-[11px] text-slate-500">{depolar.map((d) => `${depoKisa(d.ad)} ${sayi(depoStok(u, d.id))}`).join(' · ')}</div>}
        </div>
      </div>
      {muadil.length > 0 && <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <button className="inline-flex items-center gap-1 text-xs font-medium text-marka-700 dark:text-marka-500" onClick={() => setAc(!ac)}>
          {ac ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Muadiller: {muadil.length}{stoktaMuadil.length ? `, ${stoktaMuadil.length} tanesi stokta` : ', hiçbiri stokta değil'}
        </button>
        {ac && <div className="mt-2 space-y-1">{muadil.slice(0, 20).map((m) => (
          <button key={m.id} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => detayAc({ tur: 'urun', id: m.id })}>
            <span className="min-w-0"><span className="block truncate">{m.ad}</span><span className="block text-[11px] text-slate-500">{[m.kod, m.marka, m.raf && `Raf ${m.raf}`].filter(Boolean).join(' · ')}</span></span>
            <span className="shrink-0 text-right"><span className="block font-medium">{para(m.satis_fiyati)}</span>
              <span className={`block text-[11px] ${m.stok > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>stok {sayi(m.stok)}{depolar.length > 1 && m.stok > 0 ? ` (${depolar.map((d) => `${depoKisa(d.ad)} ${sayi(depoStok(m, d.id))}`).join(', ')})` : ''}</span></span>
          </button>))}</div>}
      </div>}
    </div>
  );
}

/** Otomarmara'da canlı arama: bizde olmayan kodlar için; sonuçta bizdeki karşılığı (stok kodu / OEM / eşdeğer) işaretlenir */
function OtomarmaraArama({ q, oto, maliyet }: { q: string; oto: boolean; maliyet: boolean }) {
  const { db } = useStore();
  const [aranan, setAranan] = useState<string | null>(null);
  const [y, setY] = useState<OmAramaYanit | null>(null); const [hata, setHata] = useState<string | null>(null); const [bekle, setBekle] = useState(false);
  const calistir = async (s: string) => {
    setAranan(s); setBekle(true); setHata(null); setY(null);
    try { setY(await backend.omAra(s)); } catch (e) { setHata((e as Error).message); } finally { setBekle(false); }
  };
  // bizde hiç sonuç yoksa ve kod gibi görünüyorsa kendiliğinden ara (yazmayı bitirince)
  useEffect(() => { if (!oto || q.trim().length < 4 || aranan === q) return; const t = setTimeout(() => calistir(q), 700); return () => clearTimeout(t); }, [oto, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const guncel = aranan === q;
  return (
    <div className="card border-orange-200 p-3 dark:border-orange-500/30">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Otomarmara'da ara</span>
        {guncel && y && <span className="text-xs text-slate-500">{y.sonuclar.length} sonuç · {y.onbellek ? `önbellekten (${tarihSaat(y.zaman)})` : 'şimdi'}</span>}
        <button className="btn-ghost ml-auto px-3 py-1.5 text-sm" disabled={bekle || (guncel && !!y)} onClick={() => calistir(q)}>
          {bekle ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} {bekle ? 'Aranıyor…' : `“${q.slice(0, 24)}” ara`}
        </button>
      </div>
      {!guncel && !bekle && <p className="mt-1 text-xs text-slate-500">Bizde bulunamayan kodu Otomarmara B4B'de arar (yalnız okur, sipariş vermez). Sonuçlar 6 saat saklanır.</p>}
      {hata && guncel && <p className="mt-2 text-sm text-red-600">{hata}</p>}
      {guncel && y && y.sonuclar.length === 0 && <p className="mt-2 text-sm text-slate-500">Otomarmara'da da bulunamadı.</p>}
      {guncel && y && y.sonuclar.length > 0 && <div className="mt-2 space-y-1.5">{y.sonuclar.map((s) => <OmSatir key={s.id} s={s} maliyet={maliyet} db={db} />)}</div>}
    </div>
  );
}

function OmSatir({ s, maliyet, db }: { s: OmAramaYanit['sonuclar'][number]; maliyet: boolean; db: ReturnType<typeof useStore>['db'] }) {
  const bizde = useMemo(() => koddanBizdeki(db, s.kod), [db, s.kod]);
  const [d, setD] = useState<OmDetayYanit | null>(null); const [bekle, setBekle] = useState(false); const [hata, setHata] = useState<string | null>(null);
  const detay = async () => { if (d) { setD(null); return; } setBekle(true); setHata(null); try { setD(await backend.omDetay(s.id)); } catch (e) { setHata((e as Error).message); } finally { setBekle(false); } };
  // ek sütunlar Otomarmara fiyatı (= bizim alış fiyatımız) içerebilir: yalnız maliyet yetkisi olan görür
  const ek = maliyet ? s.ek.filter(Boolean).join(' · ') : '';
  return (
    <div className="rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{s.kod} <span className="font-normal text-slate-500">{s.marka}</span></div>
          <div className="text-xs text-slate-600 dark:text-slate-300">{s.ad}</div>
          {ek && <div className="mt-0.5 text-[11px] text-slate-500">{ek}</div>}
        </div>
        <button className="btn-ghost shrink-0 px-2 py-1 text-xs" onClick={detay} disabled={bekle}>{bekle ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />} {d ? 'Kapat' : 'OEM / eşdeğer'}</button>
      </div>
      {bizde.length > 0 ? <div className="mt-1.5 flex flex-wrap gap-1.5">{bizde.slice(0, 6).map((b) => (
        <button key={b.u.id} className={`rozet ${b.u.stok > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => detayAc({ tur: 'urun', id: b.u.id })}>
          Bizde: {b.u.kod || b.u.ad.slice(0, 20)} · {ESLESME_AD[b.tur]} · stok {sayi(b.u.stok)}</button>))}</div>
        : <div className="mt-1 text-[11px] text-slate-400">Bizde kayıtlı değil</div>}
      {hata && <p className="mt-1 text-xs text-red-600">{hata}</p>}
      {d && <OmDetay d={d} db={db} />}
    </div>
  );
}

function OmDetay({ d, db }: { d: OmDetayYanit; db: ReturnType<typeof useStore>['db'] }) {
  const esd = useMemo(() => d.esdegerler.map((e) => ({ ...e, bizde: koddanBizdeki(db, e.kod)[0] })), [d, db]);
  const bizdeki = esd.filter((e) => e.bizde).sort((a, b) => b.bizde!.u.stok - a.bizde!.u.stok);
  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
      <div><span className="text-slate-500">OEM ({d.oemler.length}):</span> {d.oemler.slice(0, 30).join(', ') || '—'}{d.oemler.length > 30 ? ' …' : ''}</div>
      <div><span className="text-slate-500">Eşdeğer ({esd.length}, bizde {bizdeki.length}):</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {bizdeki.map((e) => <button key={e.kod} className={`rozet ${e.bizde!.u.stok > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} onClick={() => detayAc({ tur: 'urun', id: e.bizde!.u.id })}>{e.kod} · stok {sayi(e.bizde!.u.stok)}</button>)}
          {esd.filter((e) => !e.bizde).slice(0, 20).map((e) => <span key={e.kod} className="rozet bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" title={e.ad ?? ''}>{e.kod}</span>)}
        </div>
      </div>
    </div>
  );
}
