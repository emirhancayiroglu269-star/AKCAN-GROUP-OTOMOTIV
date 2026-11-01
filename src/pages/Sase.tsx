import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Car, Loader2, Save, Search, X } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type FiyatTeklifi, type SaseArac } from '../lib/backend';
import { markaArama, ogrenilmisModel, vinCoz, vinTemizle, type OgrenilmisModel, type VinCozum } from '../lib/vin';
import { para, tarih, tarihSaat } from '../lib/format';

/** Ürün Ara sekmesine geçerken arama kutusunu ve teklifin araç bilgisini doldurmak için */
export const ON_DOLDUR = 'aramaOnDoldur';
export type OnDoldur = { q: string; arac: string; arac_id: number | null };
export function urunAraAc(v: OnDoldur) { try { sessionStorage.setItem(ON_DOLDUR, JSON.stringify(v)); } catch { /* yok */ } location.hash = 'arama/ara'; }

const PARCA = ['YAĞ FİLTRESİ', 'HAVA FİLTRESİ', 'POLEN FİLTRESİ', 'YAKIT FİLTRESİ', 'BALATA', 'DİSK', 'AMORTİSÖR', 'TRİGER', 'BUJİ', 'ROTİL', 'SALINCAK', 'DEBRİYAJ'];
const plakaNorm = (s?: string | null) => (s ?? '').toLocaleUpperCase('tr').replace(/\s/g, '');
const aracEtiket = (a: Partial<SaseArac>) => [a.plaka, [a.marka, a.model].filter(Boolean).join(' '), a.yil, a.motor].filter(Boolean).join(' · ');

type Form = { plaka: string; marka: string; model: string; yil: string; motor: string; yakit: string; musteri: string; telefon: string; notlar: string };
const BOS_FORM: Form = { plaka: '', marka: '', model: '', yil: '', motor: '', yakit: '', musteri: '', telefon: '', notlar: '' };

/** Ruhsat / şase etiketi fotoğrafından şase numarasını okur (tarayıcıda, Tesseract OCR; fotoğraf sunucuya gönderilmez) */
async function fotoVinOku(dosya: File): Promise<string[]> {
  const { createWorker } = await import('tesseract.js');
  const w = await createWorker('eng');
  try {
    await w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789IOQ :-' });
    const { data } = await w.recognize(dosya);
    const bulunan = new Set<string>();
    for (const satir of data.text.split('\n')) {
      const s = satir.toUpperCase().replace(/[^A-Z0-9]/g, '');
      for (let i = 0; i + 17 <= s.length; i++) { const v = vinTemizle(s.slice(i, i + 17)); if (vinCoz(v).marka) bulunan.add(v); }
    }
    return [...bulunan];
  } finally { await w.terminate(); }
}

export default function SaseSayfa() {
  const { personel, eposta, mode } = useStore();
  const [girdi, setGirdi] = useState('');
  const [araclar, setAraclar] = useState<SaseArac[] | null>(null);
  const [secili, setSecili] = useState<SaseArac | null>(null);
  const [cozum, setCozum] = useState<VinCozum | null>(null);
  const [nhtsa, setNhtsa] = useState<Record<string, string> | null>(null); const [nhtsaBekle, setNhtsaBekle] = useState(false); const [nhtsaHata, setNhtsaHata] = useState('');
  const [form, setForm] = useState<Form>(BOS_FORM);
  const [ocr, setOcr] = useState<'yok' | 'okuyor' | string[]>('yok');
  const [teklifler, setTeklifler] = useState<FiyatTeklifi[] | null>(null);
  const [yeni, setYeni] = useState(false);
  const [ogrenilen, setOgrenilen] = useState<OgrenilmisModel | null>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { backend.araclarOku().then(setAraclar, (e) => { setAraclar([]); toast(`Araçlar okunamadı: ${(e as Error).message}`, 'hata'); }); }, []);

  const temiz = vinTemizle(girdi);
  const vinGibi = temiz.length === 17;
  // plaka / şase / müşteri ile kayıtlı araçlarda ara
  const bulunan = useMemo(() => {
    const q = girdi.trim().toLocaleUpperCase('tr'); if (!araclar || q.length < 2) return araclar?.slice(0, 30) ?? [];
    const qp = plakaNorm(q);
    return araclar.filter((a) => (a.vin ?? '').includes(temiz) || plakaNorm(a.plaka).includes(qp) || (a.musteri ?? '').toLocaleUpperCase('tr').includes(q) || (a.telefon ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '#')).slice(0, 30);
  }, [araclar, girdi, temiz]);

  const ac = (a: SaseArac | null, c: VinCozum | null) => {
    setYeni(false); setOgrenilen(null); setSecili(a); setCozum(c); setNhtsa(a?.kaynak && typeof a.kaynak === 'object' ? (a.kaynak as { nhtsa?: Record<string, string> }).nhtsa ?? null : null); setNhtsaHata(''); setTeklifler(null);
    setForm(a ? { plaka: a.plaka ?? '', marka: a.marka ?? '', model: a.model ?? '', yil: a.yil ? String(a.yil) : '', motor: a.motor ?? '', yakit: a.yakit ?? '', musteri: a.musteri ?? '', telefon: a.telefon ?? '', notlar: a.notlar ?? '' }
      : { ...BOS_FORM, marka: c?.marka?.replace(/\s*\(.*\)/, '') ?? '', model: c?.model ?? '', yil: c?.yil && c.yilKesin ? String(c.yil) : '' });
  };

  // 17 hane girilince: kayıtlıysa aç, değilse çöz + NHTSA'dan ek bilgi
  useEffect(() => {
    if (!vinGibi || !araclar) return;
    if (secili?.vin === temiz || (cozum?.vin === temiz && !secili)) return;
    const kayitli = araclar.find((a) => a.vin === temiz);
    const c = vinCoz(temiz);
    if (kayitli) { ac(kayitli, c); return; }
    ac(null, c);
    // model tablomuzda yoksa daha önce kaydedilen aynı şase koduna sahip araçlardan öğren
    if (c.gecerli && !c.model) {
      const o = ogrenilmisModel(c.vin, araclar);
      if (o) { setOgrenilen(o); setForm((f) => ({ ...f, model: f.model || o.model, motor: f.motor || o.motor || '' })); }
    }
    if (!c.gecerli || mode !== 'bulut') return;
    setNhtsaBekle(true);
    backend.saseCoz(temiz).then((r) => {
      setNhtsa(r.nhtsa);
      setForm((f) => ({ ...f, model: f.model || r.nhtsa.model || '', yil: f.yil || (c.yilKesin && r.nhtsa.yil) || '', yakit: f.yakit || r.nhtsa.yakit || '',
        motor: f.motor || [r.nhtsa.motor_litre && `${Number(r.nhtsa.motor_litre).toFixed(1)}`, r.nhtsa.motor_kodu].filter(Boolean).join(' ') }));
    }, (e) => setNhtsaHata((e as Error).message)).finally(() => setNhtsaBekle(false));
  }, [vinGibi, temiz, araclar]); // eslint-disable-line react-hooks/exhaustive-deps

  // seçili aracın teklifleri
  useEffect(() => {
    if (!secili) return;
    backend.teklifOku(730).then((l) => setTeklifler(l.filter((t) => t.arac_id === secili.id || (!!secili.plaka && plakaNorm(t.arac).includes(plakaNorm(secili.plaka))))), () => setTeklifler([]));
  }, [secili]);

  const kaydet = async () => {
    const vin = cozum?.gecerli ? cozum.vin : secili?.vin ?? null;
    if (!vin && !form.plaka.trim()) return toast('Şase numarası ya da plaka girin', 'hata');
    try {
      const a = await backend.aracKaydet({
        id: secili?.id, vin, plaka: form.plaka.trim().toLocaleUpperCase('tr') || null, marka: form.marka.trim() || null, model: form.model.trim() || null, model_kod: cozum?.modelKod ?? secili?.model_kod ?? null,
        yil: Number(form.yil) || null, motor: form.motor.trim() || null, yakit: form.yakit.trim() || null, kasa: nhtsa?.kasa ?? secili?.kasa ?? null,
        musteri: form.musteri.trim() || null, telefon: form.telefon.trim() || null, notlar: form.notlar.trim() || null,
        kaynak: nhtsa ? { nhtsa } : secili?.kaynak ?? null, kullanici: personel || eposta || null,
      });
      setAraclar((l) => [a, ...(l ?? []).filter((x) => x.id !== a.id)]); setSecili(a); toast('Araç kaydedildi');
      return a;
    } catch (e) { toast(`Kaydedilemedi: ${(e as Error).message}`, 'hata'); }
  };

  const ara = async (q: string) => {
    let a = secili;
    if (!a && (cozum?.gecerli || form.plaka.trim())) a = (await kaydet()) ?? null; // parça aranan araç kayda geçsin (teklif bağlansın)
    urunAraAc({ q, arac: aracEtiket(a ?? { ...form, yil: Number(form.yil) || null }), arac_id: a?.id ?? null });
  };

  const fotoSec = async (f?: File) => {
    if (!f) return; setOcr('okuyor');
    try { const l = await fotoVinOku(f); setOcr(l); if (l.length === 1) { setGirdi(l[0]); setOcr('yok'); toast('Şase numarası okundu, kontrol edin'); } else if (!l.length) toast('Fotoğrafta şase numarası bulunamadı; daha yakından ve düz çekin', 'hata'); }
    catch (e) { setOcr('yok'); toast(`Okunamadı: ${(e as Error).message}`, 'hata'); }
    finally { if (dosyaRef.current) dosyaRef.current.value = ''; }
  };

  const modelSoz = useMemo(() => {
    const s = new Set<string>(cozum?.aramaSozcukleri ?? []);
    const m = form.model.trim().toLocaleUpperCase('tr'); if (m && !s.size) s.add(m.split('/')[0].trim());
    const mk = markaArama(form.marka || cozum?.marka || null); if (!s.size && mk) s.add(mk);
    return [...s];
  }, [cozum, form.model, form.marka]);
  const acik = !!(cozum || secili || yeni);
  const f = (k: keyof Form, ph: string, cls = '') => <input className={`inp py-1.5 text-sm ${cls}`} placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="card space-y-2 p-4">
        <div className="relative">
          <Car size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus className="inp py-3 pl-10 pr-24 font-mono text-base tracking-wider" placeholder="Şase no (17 hane), plaka ya da müşteri" value={girdi} maxLength={30}
            onChange={(e) => { setGirdi(e.target.value); if (vinTemizle(e.target.value) !== cozum?.vin) { setCozum(null); setSecili(null); } }} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {girdi && <button className="rounded p-1.5 text-slate-400 hover:text-slate-600" onClick={() => { setGirdi(''); ac(null, null); }} aria-label="Temizle"><X size={18} /></button>}
            <button className="rounded p-1.5 text-slate-500 hover:text-marka-700" title="Ruhsat / şase etiketi fotoğrafından oku" onClick={() => dosyaRef.current?.click()} disabled={ocr === 'okuyor'}>
              {ocr === 'okuyor' ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}</button>
            <input ref={dosyaRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => fotoSec(e.target.files?.[0])} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {vinGibi ? <span className="font-mono">{temiz.slice(0, 3)} <b>{temiz.slice(3, 9)}</b> {temiz[9]} {temiz.slice(10)}</span> : temiz.length > 8 && /\d/.test(temiz) ? <span>{temiz.length}/17 hane</span> : <span>Şaseyi yazın ya da <Camera size={12} className="inline" /> ile ruhsat fotoğrafından okutun (fotoğraf cihazınızda işlenir, gönderilmez).</span>}
          {ocr === 'okuyor' && <span>Fotoğraf okunuyor… (ilk seferde 10–20 sn)</span>}
        </div>
        {Array.isArray(ocr) && ocr.length > 1 && <div className="flex flex-wrap items-center gap-1 text-xs">Fotoğrafta birden fazla aday var:
          {ocr.map((v) => <button key={v} className="rounded bg-slate-100 px-2 py-1 font-mono hover:bg-marka-50 dark:bg-slate-800" onClick={() => { setGirdi(v); setOcr('yok'); }}>{v}</button>)}</div>}
      </div>

      {acik && <div className="card p-4">
        {cozum && !cozum.gecerli && <p className="text-sm text-red-600">{cozum.hata}</p>}
        {(cozum?.gecerli || secili || yeni) && <>
          <div className="mb-3 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold">{[form.marka || cozum?.marka || 'Bilinmeyen marka', form.model || cozum?.model].filter(Boolean).join(' ')}</div>
              <div className="text-xs text-slate-500">{[cozum?.ulke && `Üretim: ${cozum.ulke}`, form.yil, form.motor, form.yakit, nhtsa?.kasa].filter(Boolean).join(' · ')}</div>
              {cozum && !cozum.yilKesin && !form.yil && cozum.yil && !/^(Mercedes|BMW|Mini)/.test(cozum.marka ?? '') && <div className="mt-0.5 text-[11px] text-slate-500">Bu markada şasenin 10. hanesi yılı kesin göstermez ({cozum.vin[9]} → {cozum.yil} olabilir); ruhsattaki yılı yazın.</div>}
              {secili && <div className="mt-0.5 text-[11px] text-emerald-700">Kayıtlı araç · ilk kayıt {tarih(secili.olusturma)}{secili.kullanici ? ` · ${secili.kullanici}` : ''}</div>}
            </div>
            <div className="text-right text-[11px] text-slate-500">
              {nhtsaBekle && <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> NHTSA'ya soruluyor…</span>}
              {nhtsaHata && <span className="text-amber-600">NHTSA: {nhtsaHata}</span>}
              {nhtsa && !nhtsaBekle && <span title={Object.entries(nhtsa).map(([k, v]) => `${k}: ${v}`).join('\n')}>NHTSA: {Object.keys(nhtsa).filter((k) => !k.startsWith('hata')).length} bilgi</span>}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {f('plaka', 'Plaka', 'uppercase')}{f('marka', 'Marka')}{f('model', 'Model (ör. Megane 3)')}{f('yil', 'Yıl')}
            {f('motor', 'Motor (ör. 1.5 dCi K9K)')}{f('yakit', 'Yakıt')}{f('musteri', 'Müşteri')}{f('telefon', 'Telefon')}
            <input className="inp py-1.5 text-sm sm:col-span-3" placeholder="Not (ör. km, yapılan işler)" value={form.notlar} onChange={(e) => setForm({ ...form, notlar: e.target.value })} />
            <button className="btn-primary py-1.5 text-sm" onClick={kaydet}><Save size={15} /> {secili ? 'Güncelle' : 'Aracı kaydet'}</button>
          </div>
          {cozum && !cozum.model && ogrenilen && <p className="mt-2 text-xs text-sky-700">Model kayıtlı araçlardan öğrenildi: şasesinin ilk {ogrenilen.hane} hanesi aynı {ogrenilen.toplam} araçtan {ogrenilen.destek} tanesi “{ogrenilen.model}”{ogrenilen.motor ? ` (${ogrenilen.motor})` : ''}. Ruhsatla kontrol edin; yanlışsa düzeltip kaydedin, sistem düzeltmeyi de öğrenir.</p>}
          {cozum && !cozum.model && !ogrenilen && <p className="mt-2 text-xs text-amber-700">Model şaseden kesin çıkarılamadı{cozum.marka ? ` (${cozum.marka} için model tablosu yok)` : ''}; ruhsattaki ticari adı Model kutusuna yazın. Kaydettiğinizde sistem bu şase kodunu öğrenir; aynı koddaki sonraki araçlarda modeli kendisi önerir.</p>}

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="mb-1.5 text-xs font-semibold">Bu araç için bizde ara</div>
            {modelSoz.length > 0 ? <>
              <div className="mb-2 flex flex-wrap gap-1.5">{modelSoz.map((m) => <button key={m} className="rounded-full border border-marka-300 bg-marka-50 px-3 py-1 text-sm text-marka-800 hover:bg-marka-100 dark:bg-marka-500/10 dark:text-marka-200" onClick={() => ara(m)}><Search size={13} className="mr-1 inline" />{m} (tümü)</button>)}</div>
              <div className="flex flex-wrap gap-1">{PARCA.map((p) => <button key={p} className="rounded border border-slate-200 px-2 py-1 text-xs hover:border-marka-300 hover:text-marka-700 dark:border-slate-700" onClick={() => ara(`${modelSoz[0]} ${p}`)}>{p}</button>)}</div>
              <p className="mt-1.5 text-[11px] text-slate-500">Ürün Ara'da ürün adında “{modelSoz[0]}” geçenler listelenir; teklif açarsanız araç bilgisi teklife otomatik yazılır. Uygunluğu OEM ile doğrulayın.</p>
            </> : <p className="text-xs text-slate-500">Model ya da marka yazınca arama düğmeleri çıkar.</p>}
          </div>

          {secili && <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="mb-1.5 text-xs font-semibold">Bu araca verilen teklifler</div>
            {teklifler === null ? <p className="text-xs text-slate-500">Okunuyor…</p> : !teklifler.length ? <p className="text-xs text-slate-500">Henüz teklif yok.</p> :
              <ul className="space-y-1 text-sm">{teklifler.slice(0, 10).map((t) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{tarihSaat(t.zaman)} · {t.kalemler.map((k) => k.ad).join(', ')}</span><span className="shrink-0 font-medium">{para(t.toplam)} <span className="text-[11px] font-normal text-slate-500">{t.durum === 'satildi' ? 'satıldı' : t.durum === 'kaybedildi' ? 'kaybedildi' : t.musteri_yanit === 'onay' ? 'müşteri onayladı' : 'açık'}</span></span></li>)}</ul>}
          </div>}
        </>}
      </div>}

      {!acik && <div className="card p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">Kayıtlı araçlar <span className="text-xs font-normal text-slate-500">{araclar ? `${araclar.length} araç` : 'okunuyor…'}</span></div>
        {girdi.trim().length >= 5 && !vinGibi && !bulunan.length && <button className="btn-ghost mb-2 text-sm" onClick={() => { ac(null, null); setYeni(true); setForm({ ...BOS_FORM, plaka: girdi.trim().toLocaleUpperCase('tr') }); }}><Car size={15} /> “{girdi.trim().toLocaleUpperCase('tr')}” plakalı yeni araç (şasesiz)</button>}
        {araclar && !araclar.length && <p className="text-sm text-slate-500">Henüz araç yok. Şaseyi yazıp “Aracı kaydet” deyin ya da parça aradığınızda araç kendiliğinden kaydedilir.</p>}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{bulunan.map((a) => (
          <button key={a.id} className="flex w-full items-center justify-between gap-2 px-1 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => { setGirdi(a.vin ?? a.plaka ?? ''); ac(a, a.vin ? vinCoz(a.vin) : null); }}>
            <span className="min-w-0"><span className="block truncate font-medium">{aracEtiket(a) || a.vin}</span><span className="block truncate text-[11px] text-slate-500">{[a.musteri, a.telefon, a.vin].filter(Boolean).join(' · ')}</span></span>
            <span className="shrink-0 text-[11px] text-slate-400">{tarih(a.son_islem)}</span>
          </button>))}</div>
      </div>}
    </div>
  );
}
