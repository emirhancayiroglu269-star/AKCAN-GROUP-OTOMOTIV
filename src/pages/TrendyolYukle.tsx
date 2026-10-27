import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, ImageOff, Info, Pencil, Play, Plus, Search, Send, Trash2 } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type TyKategoriEsleme, type TyMarkaEsleme, type TyOtoOzet, type TyOzellikDeger, type TyVeri, type TyYukleme } from '../lib/backend';
import { maliyet, tyHedefFiyat, TY_VARSAYILAN, type TyVarsayim } from '../lib/trendyol';
import { sonAlislar } from '../lib/analiz2';
import { stokluMu } from '../lib/analiz';
import { aracCikar } from '../lib/analiz3';
import { kodHaritasi } from '../lib/kod';
import { ara, para, parse, sayi, tarihSaat } from '../lib/format';
import type { Urun } from '../lib/types';
import { UrunLink } from '../components/DetayKart';
import { Bos, Modal, onayla } from '../components/ui';

type Ozellik = { id: number; ad: string; zorunlu: boolean; serbest: boolean; coklu: boolean; degerler: { id: number; ad: string }[] };
type KatBilgi = { kategori: string; ozellikler: Ozellik[] };
const ARAC_ID = 370;
/** Araca/motora göre değişen özellikler her üründe ayrı seçilir (kategori varsayılanına konmaz) */
const urunOzel = (o: Pick<Ozellik, 'id' | 'ad'>) => o.id === ARAC_ID || /motor|araç|arac/i.test(o.ad);
type Secim = { id: number; ad: string } | null;
const katla = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const SAKLA = 'ty_yukle_secili';
const yerelAl = (): string[] => { try { return JSON.parse(localStorage.getItem(SAKLA) ?? '[]') as string[]; } catch { return []; } };
const yerelYaz = (l: string[]) => { try { localStorage.setItem(SAKLA, JSON.stringify(l)); } catch { /* yok */ } };

/** Trendyol'a yeni ilan: ürün seç → kategori/marka/araç tamamla → gönder */
export function TrendyolYukle({ veri, v }: { veri: TyVeri; v: TyVarsayim }) {
  const { db } = useStore();
  const [secili, setSecili] = useState<string[]>(yerelAl);
  const [esleme, setEsleme] = useState<{ kategori: TyKategoriEsleme[]; marka: TyMarkaEsleme[]; yukleme: TyYukleme[] } | null>(null);
  const [gorsel, setGorsel] = useState<Map<string, string[]>>(new Map());
  const [katBilgi, setKatBilgi] = useState<Map<number, KatBilgi | 'yukleniyor' | 'hata'>>(new Map());
  const [duzen, setDuzen] = useState<Record<string, { baslik?: string; fiyat?: string; oz?: Record<number, Secim> }>>({});
  const [q, setQ] = useState('');
  const [katModal, setKatModal] = useState<string | null>(null);
  const [markaModal, setMarkaModal] = useState<string | null>(null);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ gonderilen: number; hatalar: string[] } | null>(null);

  const eslemeOku = () => backend.tyEslemeOku().then(setEsleme, (e) => toast(`Eşleşmeler okunamadı: ${(e as Error).message}`, 'hata'));
  useEffect(() => { eslemeOku(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { yerelYaz(secili); }, [secili]);
  useEffect(() => { const eksik = secili.filter((id) => !gorsel.has(id)); if (eksik.length) backend.urunGorselleri(eksik).then((m) => setGorsel((g) => new Map([...g, ...m]))).catch(() => undefined); }, [secili]); // eslint-disable-line react-hooks/exhaustive-deps

  const urun = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  const son = useMemo(() => sonAlislar(db), [db]);
  const kodlar = useMemo(() => kodHaritasi(db), [db]);
  const ilanli = useMemo(() => new Set([...veri.urunler.map((t) => t.urun_id).filter(Boolean) as string[], ...((esleme?.yukleme ?? []).filter((y) => y.durum !== 'hatali').map((y) => y.urun_id).filter(Boolean) as string[])]), [veri.urunler, esleme]);
  const ilanBarkod = useMemo(() => new Set(veri.urunler.map((t) => t.barkod)), [veri.urunler]);
  const katMap = useMemo(() => new Map((esleme?.kategori ?? []).map((k) => [k.bh_kategori, k])), [esleme]);
  const markaMap = useMemo(() => new Map((esleme?.marka ?? []).map((k) => [k.bh_marka, k])), [esleme]);
  const komisyonKat = useMemo(() => { const m = new Map<number, number>(); for (const t of veri.urunler) if (t.kategori_id && t.komisyon) m.set(t.kategori_id, t.komisyon); return m; }, [veri.urunler]);

  // kullanılan Trendyol kategorilerinin özellik listesi (zorunlu alanları denetlemek için)
  const kullanilanKat = [...new Set(secili.map((id) => urun.get(id)).map((u) => (u?.kategori ? katMap.get(u.kategori)?.ty_kategori_id : undefined)).filter(Boolean) as number[])];
  useEffect(() => {
    for (const k of kullanilanKat) if (!katBilgi.has(k)) {
      setKatBilgi((m) => new Map(m).set(k, 'yukleniyor'));
      backend.tyIslem<KatBilgi>({ islem: 'ozellikler', kategoriId: k }).then((b) => setKatBilgi((m) => new Map(m).set(k, b)), () => setKatBilgi((m) => new Map(m).set(k, 'hata')));
    }
  }, [kullanilanKat.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const adaylar = useMemo(() => {
    if (q.trim().length < 2) return [];
    return db.urunler.filter((u) => u.aktif && stokluMu(u) && u.stok > 0 && !ilanli.has(u.id) && !(u.barkod && ilanBarkod.has(u.barkod)) && !secili.includes(u.id) && ara(q, u.ad, u.kod, u.marka, u.kategori, u.barkod)).slice(0, 30);
  }, [q, db.urunler, ilanli, ilanBarkod, secili]);

  const aracOner = (u: Urun, ozs: Ozellik[] | undefined) => {
    const o = ozs?.find((x) => x.id === ARAC_ID); if (!o || !o.degerler.length) return null;
    // ürün adında ilk geçen araç modeli (ör. "POLO V ... FABIA" → Volkswagen Polo)
    const ad = ` ${katla(u.ad).replace(/[^a-z0-9]+/g, ' ')} `; let enIyi: { d: { id: number; ad: string }; i: number } | null = null;
    for (const d of o.degerler) {
      const parca = katla(d.ad).split(/\s+/); const model = parca.slice(1).join(' '); if (model.length < 3 || model === 'universal') continue;
      const i = ad.indexOf(` ${model.replace(/[^a-z0-9]+/g, ' ').trim()} `); if (i >= 0 && (!enIyi || i < enIyi.i || (i === enIyi.i && d.ad.length > enIyi.d.ad.length))) enIyi = { d, i };
    }
    if (enIyi) return enIyi.d;
    const a = aracCikar(u.ad);
    if (a) {
      const mk = katla(a.marka); const md = a.model ? katla(a.model) : null;
      const tam = md ? o.degerler.find((d) => { const k = katla(d.ad); return k.includes(mk) && k.includes(md); }) : null; if (tam) return tam;
      const sadece = o.degerler.find((d) => katla(d.ad) === mk); if (sadece) return sadece;
    }
    return o.degerler.find((d) => katla(d.ad) === 'universal') ?? null;
  };

  const ozOner = (u: Urun, o: Ozellik): Secim => {
    if (o.id === ARAC_ID) return aracOner(u, [o]);
    const ad = katla(u.ad);
    if (/hac[iı]?m/i.test(o.ad)) { const m = u.ad.match(/(^|[^0-9])([0-6])[.,]([0-9])(?![0-9])/); if (m) { const d = o.degerler.find((x) => x.ad.startsWith(`${m[2]}.${m[3]}L`)); if (d) return d; } return null; }
    if (/teknoloji/i.test(o.ad)) { const l = [...o.degerler].sort((a, b) => b.ad.length - a.ad.length); return l.find((d) => { const k = katla(d.ad); return k.length >= 3 && new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(ad); }) ?? null; }
    return null;
  };

  const satirlar = secili.map((id) => urun.get(id)).filter(Boolean).map((u) => {
    u = u!; const d = duzen[u.id] ?? {};
    const km = u.kategori ? katMap.get(u.kategori) : undefined; const mm = u.marka ? markaMap.get(u.marka) : undefined;
    const kb = km ? katBilgi.get(km.ty_kategori_id) : undefined; const ozs = kb && typeof kb === 'object' ? kb.ozellikler : undefined;
    const ozelOz = (ozs ?? []).filter((o) => urunOzel(o) && !o.serbest && o.degerler.length && (o.zorunlu || o.id === ARAC_ID));
    const ozSecim = new Map<number, Secim>(ozelOz.map((o) => [o.id, d.oz && o.id in d.oz ? d.oz[o.id] : ozOner(u, o)]));
    const arac = ozSecim.get(ARAC_ID) ?? null;
    const a = maliyet(db, u, son); const kom = km ? komisyonKat.get(km.ty_kategori_id) ?? v.komisyon : v.komisyon;
    const hedef = a > 0 ? tyHedefFiyat(a, u.kdv, v, kom) : null;
    const fiyat = d.fiyat !== undefined ? parse(d.fiyat) : hedef ?? 0;
    const g = gorsel.get(u.id); const stok = Math.max(0, Math.floor(u.stok) - (db.ayarlar.trendyol?.guvenlik ?? 0));
    const baslik = (d.baslik ?? `${u.marka ? u.marka + ' ' : ''}${u.ad}`).slice(0, 100);
    const ozelIds = new Set(ozelOz.map((o) => o.id));
    const ozellikler: TyOzellikDeger[] = [...(km?.ozellikler ?? []).filter((x) => x.attributeId !== ARAC_ID && !ozelIds.has(x.attributeId)), ...[...ozSecim.entries()].filter(([, v]) => v).map(([id, v]) => ({ attributeId: id, attributeValueId: v!.id }))];
    const verilen = new Set(ozellikler.map((x) => x.attributeId));
    const eksikOz = (ozs ?? []).filter((x) => x.zorunlu && !verilen.has(x.id)).map((x) => x.ad);
    const eksik = [!u.barkod && 'barkod', g && !g.length && 'görsel', !km && 'Trendyol kategorisi', !mm && 'Trendyol markası', !(fiyat > 0) && 'fiyat', ...eksikOz].filter(Boolean) as string[];
    const kodlarU = (kodlar.get(u.id) ?? []).filter((k) => k.tur !== 'OTOMARMARA').map((k) => k.kod);
    const aciklama = [u.ad, u.marka && `Marka: ${u.marka}`, u.kod && `Stok kodu: ${u.kod}`, (u.etiket || kodlarU.length) && `OEM / muadil kodları: ${[u.etiket, ...kodlarU].filter(Boolean).join(', ')}`, arac && `Uyumlu araç: ${arac.ad}`].filter(Boolean).join('\n');
    return { u, km, mm, ozs, kb, arac, ozelOz, ozSecim, a, kom, hedef, fiyat, g, stok, baslik, ozellikler, eksik, aciklama, kayipVar: hedef !== null && fiyat > 0 && fiyat < hedef * 0.9 };
  });
  const hazir = satirlar.filter((x) => !x.eksik.length && x.g !== undefined);

  const gonder = async () => {
    if (!hazir.length) return;
    if (!onayla(`${hazir.length} ürün Trendyol'a yeni ilan olarak gönderilecek. Trendyol onayından sonra yayına girer. Devam edilsin mi?`)) return;
    setGonderiyor(true); setSonuc(null);
    try {
      const r = await backend.tyIslem<{ gonderilen: number; hatalar: string[] }>({ islem: 'urun_yukle', kalemler: hazir.map((x) => ({
        urun_id: x.u.id, baslik: x.baslik, aciklama: x.aciklama, fiyat: x.fiyat, stok: x.stok, desi: x.km?.desi ?? 1,
        kategori_id: x.km!.ty_kategori_id, marka_id: x.mm!.ty_marka_id, ozellikler: x.ozellikler, gorseller: x.g ?? [] })) });
      setSonuc({ gonderilen: r.gonderilen, hatalar: r.hatalar ?? [] });
      toast(`${r.gonderilen} ürün Trendyol'a gönderildi; onay durumu birkaç dakika içinde görünür`);
      setSecili((s) => s.filter((id) => !hazir.some((x) => x.u.id === id)));
      await eslemeOku();
    } catch (e) { toast(`Gönderilemedi: ${(e as Error).message}`, 'hata'); } finally { setGonderiyor(false); }
  };
  const ekle = (ids: string[]) => setSecili((s) => [...s, ...ids.filter((id) => !s.includes(id))].slice(0, 200));

  return (
    <div className="space-y-4">
      <OtoYukleme kategoriSec={setKatModal} markaSec={setMarkaModal} yenile={eslemeOku} />
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="inp pl-9" placeholder="Ürün ekle: ad, stok kodu, marka, kategori… (stokta olup Trendyol'da olmayanlar)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {adaylar.length > 0 && <button className="btn-ghost" onClick={() => { ekle(adaylar.map((u) => u.id)); setQ(''); }}><Plus size={15} /> Hepsini ekle ({adaylar.length})</button>}
        </div>
        {adaylar.length > 0 && <div className="mt-2 max-h-64 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {adaylar.map((u) => (
            <button key={u.id} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => ekle([u.id])}>
              <Plus size={14} className="text-marka-600" /><span className="min-w-0 flex-1 truncate">{u.ad}</span><span className="text-xs text-slate-500">{[u.kod, u.marka, u.kategori].filter(Boolean).join(' · ')} · stok {sayi(u.stok)}</span>
            </button>))}
        </div>}
        <p className="mt-2 text-xs text-slate-500">"Trendyol'a uygun ürünler" sekmesindeki önerilerden de ekleyebilirsiniz. Seçim bu tarayıcıda saklanır.</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <b>Yüklenecek ürünler</b><span className="text-xs text-slate-500">{satirlar.length} seçili · <span className="text-emerald-700">{hazir.length} hazır</span>{satirlar.length - hazir.length > 0 && <> · <span className="text-amber-700">{satirlar.length - hazir.length} eksik bilgili</span></>}</span>
          {satirlar.length > 0 && <button className="text-xs text-slate-500 hover:underline" onClick={() => setSecili([])}>Listeyi temizle</button>}
          <button className="btn-primary ml-auto" disabled={!hazir.length || gonderiyor} onClick={gonder}><Send size={15} /> {gonderiyor ? 'Gönderiliyor…' : `Trendyol'a gönder (${hazir.length})`}</button>
        </div>
        {sonuc && <div className={`border-b p-3 text-sm ${sonuc.hatalar.length ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'}`}>
          {sonuc.gonderilen} ürün gönderildi.{sonuc.hatalar.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{sonuc.hatalar.map((h) => <li key={h}>{h}</li>)}</ul>}</div>}
        {!esleme ? <div className="p-6 text-center text-sm text-slate-500">Yükleniyor…</div> : satirlar.length === 0 ? <Bos metin="Yukarıdan ürün arayıp ekleyin." /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {satirlar.map((x) => (
              <div key={x.u.id} className="flex flex-wrap gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {x.g === undefined ? null : x.g.length ? <img src={x.g[0]} alt="" className="h-full w-full object-contain" loading="lazy" /> : <div className="flex h-full flex-col items-center justify-center text-[10px] text-red-600"><ImageOff size={18} />görsel yok</div>}
                </div>
                <div className="min-w-[16rem] flex-1 space-y-1.5">
                  <input className="inp py-1 text-sm font-medium" value={x.baslik} maxLength={100} onChange={(e) => setDuzen({ ...duzen, [x.u.id]: { ...duzen[x.u.id], baslik: e.target.value } })} title="Trendyol ilan başlığı (en fazla 100 karakter)" />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-500"><UrunLink id={x.u.id}>{x.u.kod ?? 'kart'}</UrunLink> · barkod {x.u.barkod ?? <b className="text-red-600">yok</b>} · stok {sayi(x.stok)}{x.g && x.g.length > 1 ? ` · ${x.g.length} görsel` : ''}</span>
                    <button className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${x.km ? 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200' : 'bg-red-50 text-red-700'}`} onClick={() => setKatModal(x.u.kategori ?? '')} disabled={!x.u.kategori}>
                      <Pencil size={11} /> {x.km ? x.km.ty_kategori_ad : x.u.kategori ? `"${x.u.kategori}" için Trendyol kategorisi seçin` : 'BizimHesap kategorisi yok'}</button>
                    <button className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${x.mm ? 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200' : 'bg-red-50 text-red-700'}`} onClick={() => setMarkaModal(x.u.marka ?? '')} disabled={!x.u.marka}>
                      <Pencil size={11} /> {x.mm ? x.mm.ty_marka_ad : x.u.marka ? `"${x.u.marka}" için Trendyol markası seçin` : 'BizimHesap markası yok'}</button>
                    {x.ozelOz.map((o) => <OzSec key={o.id} ozellik={o} secili={x.ozSecim.get(o.id) ?? null} gerekli={o.zorunlu}
                      sec={(a) => setDuzen({ ...duzen, [x.u.id]: { ...duzen[x.u.id], oz: { ...(duzen[x.u.id]?.oz ?? {}), [o.id]: a } } })} />)}
                    {x.kb === 'yukleniyor' && <span className="text-slate-400">özellikler okunuyor…</span>}
                    {x.kb === 'hata' && <span className="text-red-600">kategori özellikleri okunamadı</span>}
                  </div>
                  {x.eksik.length > 0 ? <div className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangle size={13} /> Eksik: {x.eksik.join(', ')}</div>
                    : <div className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={13} /> Gönderilmeye hazır</div>}
                </div>
                <div className="w-40 shrink-0 text-right">
                  <div className="text-[11px] text-slate-500">Trendyol fiyatı (KDV dahil)</div>
                  <input className="inp py-1 text-right font-semibold" inputMode="decimal" value={duzen[x.u.id]?.fiyat ?? (x.fiyat ? String(x.fiyat) : '')} onChange={(e) => setDuzen({ ...duzen, [x.u.id]: { ...duzen[x.u.id], fiyat: e.target.value } })} />
                  <div className="mt-0.5 text-[10px] text-slate-400">dükkân {para(x.u.satis_fiyati)}{x.hedef ? ` · hedef ${para(x.hedef)}` : ' · alış yok'} · kom. %{x.kom}</div>
                  {x.kayipVar && <div className="text-[10px] text-red-600">hedef kârın altında</div>}
                </div>
                <button className="self-start rounded p-1 text-slate-400 hover:text-red-600" title="Listeden çıkar" onClick={() => setSecili((s) => s.filter((id) => id !== x.u.id))}><Trash2 size={15} /></button>
              </div>))}
          </div>)}
      </div>

      <div className="card">
        <div className="border-b border-slate-200 p-3 dark:border-slate-800"><b>Yükleme geçmişi</b> <span className="text-xs text-slate-500">Trendyol onayı birkaç dakika–birkaç saat sürebilir</span></div>
        {!esleme?.yukleme.length ? <Bos metin="Henüz yükleme yok." /> : (
          <div className="max-h-[40vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Zaman</th><th>Ürün</th><th className="text-right">Fiyat</th><th className="text-right">Stok</th><th>Durum</th></tr></thead>
              <tbody>{esleme.yukleme.map((y) => (
                <tr key={y.id}><td className="whitespace-nowrap text-xs">{tarihSaat(y.zaman)}</td><td className="text-sm">{y.baslik ?? y.barkod}</td><td className="text-right">{y.fiyat ? para(y.fiyat) : '—'}</td><td className="text-right">{y.stok ?? '—'}</td>
                  <td><span className={`rozet ${y.durum === 'basarili' ? 'bg-emerald-50 text-emerald-700' : y.durum === 'hatali' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{y.durum === 'basarili' ? 'Trendyol kabul etti' : y.durum === 'hatali' ? 'hata' : 'işleniyor'}</span>
                    {y.hata && <div className="mt-0.5 max-w-md text-[11px] text-red-600">{y.hata}</div>}</td></tr>))}</tbody>
            </table>
          </div>)}
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Kategori ve marka, BizimHesap kategorisi/markası başına bir kez seçilir ve o kategorideki bütün ürünlere uygulanır (mevcut ilanlarınızdan otomatik öğrenildi). Görseller BizimHesap'taki ürün fotoğraflarıdır; görseli olmayan ürün Trendyol'a yüklenemez. Fiyat, kâr hedefine göre önerilir; değiştirebilirsiniz. Yüklenen ilan onaylanınca stoğu, stok gönderimiyle iki deponun toplamına göre eşitlenir.</p>

      {katModal !== null && <KategoriModal bh={katModal} mevcut={katMap.get(katModal)} kapat={() => setKatModal(null)} kaydedildi={() => { setKatModal(null); setKatBilgi(new Map()); eslemeOku(); }} />}
      {markaModal !== null && <MarkaModal bh={markaModal} kapat={() => setMarkaModal(null)} kaydedildi={() => { setMarkaModal(null); eslemeOku(); }} />}
    </div>
  );
}

/** Otomatik yükleme: zamanlayıcı her 15 dakikada eşleşmesi hazır ürünlerden günlük sınıra kadar ilan açar */
function OtoYukleme({ kategoriSec, markaSec, yenile }: { kategoriSec: (k: string) => void; markaSec: (m: string) => void; yenile: () => void }) {
  const { db, calistir } = useStore();
  const ayar = db.ayarlar.trendyol ?? null;
  const acik = ayar?.oto_yukle === true; const duzenli = ayar?.oto_duzenli !== false;
  const [limit, setLimit] = useState(String(ayar?.oto_limit ?? 30));
  const [ozet, setOzet] = useState<TyOtoOzet | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [atlananAc, setAtlananAc] = useState(false);
  const oku = () => backend.tyOtoOzet().then(setOzet, (e) => toast(`Otomatik yükleme özeti okunamadı: ${(e as Error).message}`, 'hata'));
  useEffect(() => { oku(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const yaz = (p: { oto_yukle?: boolean; oto_limit?: number; oto_duzenli?: boolean }, mesaj: string) =>
    calistir(async () => { await backend.ayarKaydet({ trendyol: { ...TY_VARSAYILAN, ...(ayar ?? {}), ...p } }); await oku(); }, mesaj);
  const simdi = async () => {
    if (!onayla("Eşleşmesi hazır ürünlerden en fazla 10 tanesi şimdi Trendyol'a yeni ilan olarak gönderilecek. Devam edilsin mi?")) return;
    setCalisiyor(true);
    try {
      const r = await backend.tyIslem<{ gonderilen: number; atlanan: number; markaYeni?: number; not?: string }>({ islem: 'oto_yukle', adet: 10 });
      toast(`${r.gonderilen} ürün gönderildi${r.atlanan ? `, ${r.atlanan} ürün eksik bilgiden atlandı` : ''}${r.markaYeni ? `, ${r.markaYeni} marka otomatik eşleşti` : ''}${r.not ? ` (${r.not})` : ''}`);
      await oku(); yenile();
    } catch (e) { toast(`Çalıştırılamadı: ${(e as Error).message}`, 'hata'); } finally { setCalisiyor(false); }
  };
  const l = parse(limit) || 30;
  const katlar = (ozet?.eslesmemis ?? []).filter((x) => x.tur === 'kategori'); const markalar = (ozet?.eslesmemis ?? []).filter((x) => x.tur === 'marka');
  return (
    <div className={`card p-4 ${acik ? 'ring-1 ring-emerald-300 dark:ring-emerald-700' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Bot size={18} className={acik ? 'text-emerald-600' : 'text-slate-400'} />
        <b>Otomatik ürün yükleme</b>
        <span className={`rozet ${acik ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{acik ? 'AÇIK' : 'kapalı'}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className="btn-ghost" disabled={calisiyor} onClick={simdi}><Play size={15} /> {calisiyor ? 'Çalışıyor…' : 'Şimdi çalıştır'}</button>
          {acik ? <button className="btn-ghost text-red-600" onClick={() => yaz({ oto_yukle: false }, 'Otomatik yükleme kapatıldı')}>Kapat</button>
            : <button className="btn-primary" onClick={() => yaz({ oto_yukle: true, oto_limit: l }, 'Otomatik yükleme açıldı')}>Aç</button>}
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Açıkken sistem her 15 dakikada bir; stokta olan, barkodu ve fotoğrafı bulunan, kategorisi ve markası Trendyol'la eşleşmiş, henüz ilanı olmayan ürünleri kâr hedefine göre fiyatlayıp yeni ilan olarak açar. Aracı ürün adından seçer (bulamazsa Universal). Zorunlu bir özelliği seçemediği ürünü atlar.</p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"><div className="text-xs text-slate-500">Bugün yüklenen</div><b>{ozet ? `${ozet.bugun} / ${ayar?.oto_limit ?? 30}` : '…'}</b></div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"><div className="text-xs text-slate-500">Yüklenmeye hazır</div><b>{ozet ? (duzenli ? ozet.duzenli : ozet.aday) : '…'}</b> <span className="text-xs text-slate-500">ürün</span></div>
        <label className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"><div className="text-xs text-slate-500">Günlük en fazla</div>
          <span className="flex items-center gap-1"><input className="inp w-20 py-0.5 text-right" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
            {l !== (ayar?.oto_limit ?? 30) && <button className="text-xs text-marka-600 hover:underline" onClick={() => yaz({ oto_limit: Math.max(1, Math.min(200, Math.round(l))) }, 'Günlük sınır kaydedildi')}>Kaydet</button>}</span></label>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"><input type="checkbox" className="mt-1" checked={duzenli} onChange={(e) => yaz({ oto_duzenli: e.target.checked }, e.target.checked ? 'Yalnız düzenli satılanlar yüklenecek' : 'Stoktaki tüm uygun ürünler yüklenecek')} />
          <span><span className="text-xs text-slate-500">Seçim</span><br />Yalnız düzenli satılanlar <span className="text-xs text-slate-500">(6 ayda 2+ satış; tümü: {ozet?.aday ?? '…'})</span></span></label>
      </div>
      {(katlar.length > 0 || markalar.length > 0) && <div className="mt-3 space-y-1.5 text-xs">
        <div className="text-slate-500">Eşleşmesi olmadığı için yüklenemeyenler (tıklayıp bir kez eşleştirin; markalar Trendyol'da aynı adla varsa sistem kendisi eşleştirir):</div>
        {katlar.length > 0 && <div className="flex flex-wrap gap-1"><span className="font-medium">Kategori:</span>{katlar.map((k) => <button key={k.ad} className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200" onClick={() => kategoriSec(k.ad)}>{k.ad} <b>{k.adet}</b></button>)}</div>}
        {markalar.length > 0 && <div className="flex flex-wrap gap-1"><span className="font-medium">Marka:</span>{markalar.map((k) => <button key={k.ad} className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200" onClick={() => markaSec(k.ad)}>{k.ad} <b>{k.adet}</b></button>)}</div>}
      </div>}
      {(ozet?.atlanan.length ?? 0) > 0 && <div className="mt-3 text-xs">
        <button className="text-slate-600 hover:underline" onClick={() => setAtlananAc(!atlananAc)}>{atlananAc ? '▾' : '▸'} Atlanan ürünler ({ozet!.atlanan.length}) — 7 gün sonra tekrar denenir; elle aşağıdan yükleyebilirsiniz</button>
        {atlananAc && <div className="mt-1 max-h-56 overflow-auto rounded border border-slate-200 dark:border-slate-800">{ozet!.atlanan.map((a) => (
          <div key={a.urun_id} className="flex gap-2 border-b border-slate-100 px-2 py-1 dark:border-slate-800"><UrunLink id={a.urun_id}>{a.ad}</UrunLink><span className="ml-auto text-amber-700">{a.neden}</span></div>))}</div>}
      </div>}
    </div>
  );
}

function OzSec({ ozellik, secili, sec, gerekli }: { ozellik: Ozellik; secili: Secim; sec: (a: Secim) => void; gerekli: boolean }) {
  const [ac, setAc] = useState(false); const [q, setQ] = useState('');
  const az = ozellik.degerler.length <= 80;
  const l = az ? ozellik.degerler.filter((d) => !q.trim() || katla(d.ad).includes(katla(q))) : q.trim().length >= 2 ? ozellik.degerler.filter((d) => katla(d.ad).includes(katla(q))).slice(0, 40) : [];
  const kisaAd = ozellik.id === ARAC_ID ? 'Araç' : ozellik.ad.replace(/^Araç /, '');
  return (
    <span className="relative">
      <button className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${secili ? 'bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200' : gerekli ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`} onClick={() => setAc(!ac)}>
        <Pencil size={11} /> {kisaAd}: {secili ? secili.ad : gerekli ? 'seçin' : 'yok'}</button>
      {ac && <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <input className="inp py-1 text-sm" autoFocus placeholder={ozellik.id === ARAC_ID ? 'ör. Megane, Doblo, Universal' : 'ara…'} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-1 max-h-56 overflow-auto">{l.map((d) => <button key={d.id} className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { sec(d); setAc(false); }}>{d.ad}</button>)}</div>
        {!gerekli && <button className="mt-1 text-xs text-slate-500 hover:underline" onClick={() => { sec(null); setAc(false); }}>Araç belirtme</button>}
      </div>}
    </span>
  );
}

function KategoriModal({ bh, mevcut, kapat, kaydedildi }: { bh: string; mevcut?: TyKategoriEsleme; kapat: () => void; kaydedildi: () => void }) {
  const { calistir } = useStore();
  const [q, setQ] = useState(bh);
  const [sonuclar, setSonuclar] = useState<{ id: number; ad: string; yol: string }[]>([]);
  const [secim, setSecim] = useState<{ id: number; ad: string } | null>(mevcut ? { id: mevcut.ty_kategori_id, ad: mevcut.ty_kategori_ad ?? '' } : null);
  const [bilgi, setBilgi] = useState<KatBilgi | null>(null);
  const [degerler, setDegerler] = useState<Record<number, TyOzellikDeger>>(() => Object.fromEntries((mevcut?.ozellikler ?? []).map((o) => [o.attributeId, o])));
  const [desi, setDesi] = useState(String(mevcut?.desi ?? 1));
  const [bekle, setBekle] = useState(false);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => { setBekle(true); backend.tyIslem<{ sonuclar: { id: number; ad: string; yol: string }[] }>({ islem: 'kategori_ara', q }).then((r) => setSonuclar(r.sonuclar), (e) => toast((e as Error).message, 'hata')).finally(() => setBekle(false)); }, 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (!secim) return; setBilgi(null); backend.tyIslem<KatBilgi>({ islem: 'ozellikler', kategoriId: secim.id }).then(setBilgi, (e) => toast((e as Error).message, 'hata')); }, [secim?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const zorunlu = (bilgi?.ozellikler ?? []).filter((o) => o.zorunlu && !(urunOzel(o) && !o.serbest && o.degerler.length));
  const tamam = !!secim && !!bilgi && zorunlu.every((o) => degerler[o.id]?.attributeValueId || degerler[o.id]?.customAttributeValue);
  const kaydet = () => calistir(async () => {
    await backend.tyIslem({ islem: 'esleme_kaydet', tur: 'kategori', bh, id: secim!.id, ad: secim!.ad, desi: parse(desi) || 1, ozellikler: zorunlu.map((o) => degerler[o.id]).filter(Boolean) });
    kaydedildi();
  }, `"${bh}" → ${secim?.ad} eşleşmesi kaydedildi`);
  return (
    <Modal acik kapat={kapat} baslik={`Trendyol kategorisi: ${bh}`} genis="lg">
      <div className="space-y-3">
        <input className="inp" autoFocus placeholder="Trendyol'da kategori ara (ör. yağ filtresi, amortisör)" value={q} onChange={(e) => setQ(e.target.value)} />
        {bekle && <div className="text-xs text-slate-500">Aranıyor…</div>}
        <div className="max-h-52 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          {sonuclar.map((k) => <button key={k.id} className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${secim?.id === k.id ? 'bg-sky-50 font-semibold dark:bg-sky-500/10' : ''}`} onClick={() => setSecim({ id: k.id, ad: k.ad })}>{k.ad}<div className="text-[11px] font-normal text-slate-500">{k.yol}</div></button>)}
          {!sonuclar.length && !bekle && <div className="p-3 text-xs text-slate-500">Sonuç yok; farklı kelime deneyin.</div>}
        </div>
        {secim && <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="mb-2 text-sm">Seçilen: <b>{secim.ad}</b></div>
          {!bilgi ? <div className="text-xs text-slate-500">Zorunlu özellikler okunuyor…</div> : (
            <div className="space-y-2">
              {zorunlu.map((o) => (
                <label key={o.id} className="block text-sm"><span className="font-medium">{o.ad}</span> <span className="text-xs text-red-600">zorunlu</span>
                  {o.serbest || !o.degerler.length ? <input className="inp mt-1 py-1" value={degerler[o.id]?.customAttributeValue ?? ''} onChange={(e) => setDegerler({ ...degerler, [o.id]: { attributeId: o.id, customAttributeValue: e.target.value, ad: o.ad, deger: e.target.value } })} />
                    : <select className="inp mt-1 py-1" value={degerler[o.id]?.attributeValueId ?? ''} onChange={(e) => { const d = o.degerler.find((x) => x.id === Number(e.target.value)); setDegerler({ ...degerler, [o.id]: { attributeId: o.id, attributeValueId: d?.id, ad: o.ad, deger: d?.ad } }); }}>
                      <option value="">Seçin…</option>{o.degerler.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}</select>}
                </label>))}
              {(bilgi.ozellikler ?? []).some((o) => o.zorunlu && urunOzel(o)) && <div className="text-xs text-slate-500">{(bilgi.ozellikler ?? []).filter((o) => o.zorunlu && urunOzel(o)).map((o) => `"${o.ad}"`).join(', ')} her üründe ayrı seçilir (ürün adından önerilir).</div>}
              <label className="flex items-center gap-2 text-sm">Desi <input className="inp w-20 py-1 text-right" inputMode="decimal" value={desi} onChange={(e) => setDesi(e.target.value)} /> <span className="text-xs text-slate-500">kargo hacmi</span></label>
            </div>)}
        </div>}
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={kapat}>Vazgeç</button><button className="btn-primary" disabled={!tamam} onClick={kaydet}>Kaydet (bu kategorideki tüm ürünler)</button></div>
      </div>
    </Modal>
  );
}

function MarkaModal({ bh, kapat, kaydedildi }: { bh: string; kapat: () => void; kaydedildi: () => void }) {
  const { calistir } = useStore();
  const [q, setQ] = useState(bh);
  const [sonuclar, setSonuclar] = useState<{ id: number; ad: string }[]>([]);
  const [bekle, setBekle] = useState(false);
  useEffect(() => { if (q.trim().length < 2) return; const t = setTimeout(() => { setBekle(true); backend.tyIslem<{ sonuclar: { id: number; ad: string }[] }>({ islem: 'marka_ara', q }).then((r) => setSonuclar(r.sonuclar), (e) => toast((e as Error).message, 'hata')).finally(() => setBekle(false)); }, 400); return () => clearTimeout(t); }, [q]);
  const sec = (m: { id: number; ad: string }) => calistir(async () => { await backend.tyIslem({ islem: 'esleme_kaydet', tur: 'marka', bh, id: m.id, ad: m.ad }); kaydedildi(); }, `"${bh}" → ${m.ad} eşleşmesi kaydedildi`);
  return (
    <Modal acik kapat={kapat} baslik={`Trendyol markası: ${bh}`}>
      <div className="space-y-3">
        <input className="inp" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Trendyol'da marka ara" />
        {bekle && <div className="text-xs text-slate-500">Aranıyor…</div>}
        <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          {sonuclar.map((m) => <button key={m.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => sec(m)}>{m.ad}</button>)}
          {!sonuclar.length && !bekle && <div className="p-3 text-xs text-slate-500">Sonuç yok. Marka Trendyol'da kayıtlı değilse satıcı panelinden marka başvurusu yapmanız gerekir.</div>}
        </div>
      </div>
    </Modal>
  );
}
