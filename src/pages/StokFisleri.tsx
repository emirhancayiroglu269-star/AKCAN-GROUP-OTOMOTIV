/**
 * Stok fişleri (Faz 1 · YALNIZ TEST SİTESİ): giriş, çıkış, transfer, sayım, açılış; onay ve iptal; AKCAN ↔ BizimHesap karşılaştırması;
 * ürün türü (stoklu / hizmet) kontrol listesi. Kurallar veritabanında uygulanır; ekran yalnız önceden uyarır.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Ban, CheckCircle2, ClipboardList, FilePlus2, Loader2, Pencil, Printer, RefreshCw, Trash2, Undo2, X } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { para, sayi, tarih, tarihSaat } from '../lib/format';
import { Bos, Modal, SayfaBaslik, onayla as sor } from '../components/ui';
import { UrunArama } from '../components/UrunArama';
import { UrunLink } from '../components/DetayKart';
import { HareketTablosu } from '../components/AkcanStok';
import type { Sayfa } from '../App';
import type { Urun } from '../lib/types';
import {
  belgeApi, DURUM_AD, karsilastir, PERSONEL_TURLER, TUR_AD, TUR_KISA, urunDurumu, yeniAnahtar,
  type Bakiye, type BelgeDurum, type BelgeOzet, type BelgeSatir, type BelgeTur, type DefterSatir, type Istisna, type UrunTuruSatir,
} from '../lib/belge';

type P = { git: (s: Sayfa) => void; alt?: string };
const TUR_RENK: Record<BelgeTur, string> = {
  GIR: 'bg-emerald-100 text-emerald-800', CIK: 'bg-amber-100 text-amber-800', TRF: 'bg-sky-100 text-sky-800', SAY: 'bg-violet-100 text-violet-800', ACL: 'bg-slate-200 text-slate-700',
};
const DURUM_RENK: Record<BelgeDurum, string> = { taslak: 'bg-amber-50 text-amber-800', onayli: 'bg-emerald-50 text-emerald-800', iptal: 'bg-red-50 text-red-700' };
const kisaEposta = (e?: string | null) => (e ? e.split('@')[0] : '—');
const bugun = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

/** depo adları ve sırası */
function useDepolar() {
  const { db } = useStore();
  const aktif = useMemo(() => db.depolar.filter((d) => d.aktif).sort((a, b) => a.ad.localeCompare(b.ad, 'tr')), [db.depolar]);
  const ad = useCallback((id?: string | null) => (id ? (db.depolar.find((d) => d.id === id)?.ad ?? '?').replace(/ DEPO$/i, '') : '—'), [db.depolar]);
  return { aktif, ad };
}
/** AKCAN bakiyeleri ve ürün türleri (form ve karşılaştırma için) */
function useAkcan(yenileSayac: number) {
  const [bakiye, setBakiye] = useState<Bakiye[] | null>(null); const [turler, setTurler] = useState<Map<string, 'stoklu' | 'hizmet'>>(new Map());
  useEffect(() => {
    let iptal = false;
    Promise.all([belgeApi.bakiyeler(), belgeApi.turler()]).then(([b, t]) => { if (!iptal) { setBakiye(b); setTurler(t); } }).catch((e) => toast((e as Error).message, 'hata'));
    return () => { iptal = true; };
  }, [yenileSayac]);
  const harita = useMemo(() => new Map((bakiye ?? []).map((x) => [`${x.urun_id}|${x.depo_id}`, x.miktar])), [bakiye]);
  const miktar = useCallback((u: string, d?: string | null) => (d ? harita.get(`${u}|${d}`) ?? 0 : 0), [harita]);
  return { bakiye, turler, miktar };
}

export default function StokFisleri({ git, alt }: P) {
  const { rol } = useStore(); const yonetici = rol === 'yonetici';
  const [sayac, setSayac] = useState(0); const yenile = () => setSayac((x) => x + 1);
  const [sayilar, setSayilar] = useState<Record<BelgeDurum, number> | null>(null);
  const [form, setForm] = useState<{ tur: BelgeTur; duzenle?: { belge: BelgeOzet; satirlar: BelgeSatir[] } } | null>(null);
  const [detay, setDetay] = useState<string | null>(null);
  const akcan = useAkcan(sayac);
  useEffect(() => { belgeApi.sayilar().then(setSayilar).catch(() => undefined); }, [sayac]);

  const sekmeler: { id: string; ad: ReactNode; izin?: boolean }[] = [
    { id: 'bekleyen', ad: <>Onay bekleyen{sayilar?.taslak ? <span className="rozet ml-1 bg-amber-100 text-amber-800">{sayilar.taslak}</span> : null}</> },
    { id: 'onayli', ad: 'Onaylı' },
    { id: 'iptal', ad: 'İptal edilen' },
    { id: 'karsilastirma', ad: 'BizimHesap karşılaştırma' },
    { id: 'tur', ad: 'Ürün türü', izin: yonetici },
    { id: 'acilis', ad: 'Açılış', izin: yonetici },
  ];
  const gorunen = sekmeler.filter((s) => s.izin !== false);
  const aktif = gorunen.find((s) => s.id === alt) ?? gorunen[0];
  const turlerYeni: BelgeTur[] = yonetici ? ['GIR', 'CIK', 'TRF', 'SAY'] : PERSONEL_TURLER;

  return (
    <div>
      <SayfaBaslik baslik="Stok Fişleri" alt="AKCAN stok defteri · deneme ortamı (BizimHesap stokları değişmez)">
        {turlerYeni.map((t) => <button key={t} className="btn-primary px-3 py-2 text-sm" onClick={() => setForm({ tur: t })}><FilePlus2 size={16} /> {TUR_KISA[t]}</button>)}
        <button className="btn-ghost px-2 py-2" title="Yenile" onClick={yenile}><RefreshCw size={16} /></button>
      </SayfaBaslik>
      <div className="mb-4 flex gap-x-1 overflow-x-auto border-b border-slate-300 dark:border-slate-700" role="tablist">
        {gorunen.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === aktif.id} onClick={() => git(`stokfis/${s.id}` as Sayfa)}
            className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-2 text-sm font-medium ${s.id === aktif.id ? 'border-marka-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}>{s.ad}</button>
        ))}
      </div>
      {(aktif.id === 'bekleyen' || aktif.id === 'onayli' || aktif.id === 'iptal') &&
        <BelgeListesi key={aktif.id + sayac} durum={aktif.id === 'bekleyen' ? 'taslak' : aktif.id as BelgeDurum} ac={setDetay} />}
      {aktif.id === 'karsilastirma' && <KarsilastirmaSekmesi akcan={akcan} />}
      {aktif.id === 'tur' && <UrunTuruSekmesi yenile={yenile} sayac={sayac} />}
      {aktif.id === 'acilis' && <AcilisSekmesi yenile={yenile} ac={setDetay} git={git} />}

      {form && <FisFormu tur={form.tur} duzenle={form.duzenle} akcan={akcan} kapat={() => setForm(null)}
        bitti={(id) => { setForm(null); yenile(); if (id) setDetay(id); }} />}
      {detay && <FisDetay id={detay} akcan={akcan} kapat={() => setDetay(null)} degisti={yenile}
        duzenle={(d) => { setDetay(null); setForm({ tur: d.belge.tur, duzenle: d }); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- liste
function BelgeListesi({ durum, ac }: { durum: BelgeDurum; ac: (id: string) => void }) {
  const depo = useDepolar();
  const [l, setL] = useState<BelgeOzet[] | null>(null); const [tur, setTur] = useState<BelgeTur | ''>('');
  useEffect(() => { belgeApi.liste(durum).then(setL).catch((e) => { toast((e as Error).message, 'hata'); setL([]); }); }, [durum]);
  if (!l) return <p className="text-sm text-slate-500"><Loader2 size={14} className="mr-1 inline animate-spin" />Yükleniyor…</p>;
  const g = l.filter((b) => !tur || b.tur === tur);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['', 'GIR', 'CIK', 'TRF', 'SAY', 'ACL'] as const).map((t) => (
          <button key={t} onClick={() => setTur(t)} className={`rounded-full border px-3 py-1 text-xs ${tur === t ? 'border-marka-500 bg-marka-50 font-semibold text-marka-700 dark:bg-slate-800' : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
            {t ? TUR_KISA[t] : 'Tümü'} <span className="text-slate-400">{t ? l.filter((b) => b.tur === t).length : l.length}</span></button>
        ))}
      </div>
      {!g.length ? <Bos metin={durum === 'taslak' ? 'Onay bekleyen fiş yok.' : durum === 'onayli' ? 'Onaylı fiş yok.' : 'İptal edilen fiş yok.'} /> : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {g.map((b) => (
            <button key={b.id} onClick={() => ac(b.id)} className="card p-3 text-left transition hover:border-marka-400 hover:shadow">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rozet ${TUR_RENK[b.tur]}`}>{TUR_KISA[b.tur]}</span>
                <span className="font-mono text-sm font-semibold">{b.no ?? 'Taslak'}</span>
                <span className={`rozet ml-auto ${DURUM_RENK[b.durum]}`}>{DURUM_AD[b.durum]}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">{depo.ad(b.depo_id)}{b.hedef_depo_id && <><ArrowRight size={14} className="text-slate-400" />{depo.ad(b.hedef_depo_id)}</>}
                <span className="ml-auto text-slate-500">{tarih(b.tarih)}</span></div>
              <div className="mt-1 text-xs text-slate-500">{b.satir} kalem · {sayi(b.toplam_miktar)} adet · {kisaEposta(b.olusturan)}
                {b.durum === 'onayli' && b.onaylayan && <> · onay {kisaEposta(b.onaylayan)}</>}{b.durum === 'iptal' && <> · iptal {kisaEposta(b.iptal_eden)}</>}</div>
              {(b.aciklama || b.iptal_nedeni) && <div className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">{b.iptal_nedeni ? `İptal nedeni: ${b.iptal_nedeni}` : b.aciklama}</div>}
            </button>
          ))}
        </div>
      )}
      {l.length >= 200 && <p className="mt-2 text-xs text-slate-500">Son 200 fiş gösteriliyor.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- form
type FormSatir = { urun_id: string; miktar: string; birim_maliyet: string; sayilan: string };
function FisFormu({ tur, duzenle, akcan, kapat, bitti }: {
  tur: BelgeTur; duzenle?: { belge: BelgeOzet; satirlar: BelgeSatir[] }; akcan: ReturnType<typeof useAkcan>; kapat: () => void; bitti: (id?: string) => void;
}) {
  const { db, rol } = useStore(); const yonetici = rol === 'yonetici'; const depo = useDepolar();
  const [anahtar] = useState(yeniAnahtar);
  const [kayit, setKayit] = useState<{ id: string; surum: number } | null>(duzenle ? { id: duzenle.belge.id, surum: duzenle.belge.surum } : null);
  const [depoId, setDepoId] = useState(duzenle?.belge.depo_id ?? depo.aktif[0]?.id ?? '');
  const [hedef, setHedef] = useState(duzenle?.belge.hedef_depo_id ?? depo.aktif.find((d) => d.id !== depoId)?.id ?? '');
  const [tarihV, setTarih] = useState(duzenle?.belge.tarih ?? bugun());
  const [aciklama, setAciklama] = useState(duzenle?.belge.aciklama ?? '');
  const [satirlar, setSatirlar] = useState<FormSatir[]>(() => (duzenle?.satirlar ?? []).map((s) => ({
    urun_id: s.urun_id, miktar: s.miktar?.toString() ?? '', birim_maliyet: s.birim_maliyet?.toString() ?? '', sayilan: s.sayilan?.toString() ?? '' })));
  const [bekle, setBekle] = useState(false);
  const maliyetli = tur === 'GIR' || tur === 'ACL'; const sayim = tur === 'SAY';
  const urun = (id: string) => db.urunler.find((u) => u.id === id);
  const sayiOku = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

  const ekle = (u: Urun) => {
    const d = urunDurumu(akcan.turler, u);
    if (d === 'hizmet') { toast(`${u.ad} bir hizmet ürünü; stok fişine eklenemez`, 'hata'); return; }
    if (d === 'belirsiz') { toast(`${u.ad} hizmet adayı; önce yönetici ürün türünü belirlemeli (Stok Fişleri > Ürün türü)`, 'hata'); return; }
    if (satirlar.some((s) => s.urun_id === u.id)) { toast('Bu ürün fişte zaten var', 'hata'); return; }
    setSatirlar((l) => [...l, { urun_id: u.id, miktar: sayim ? '' : '1', birim_maliyet: '', sayilan: '' }]);
  };
  const degis = (i: number, alan: keyof FormSatir, v: string) => setSatirlar((l) => l.map((s, j) => (j === i ? { ...s, [alan]: v } : s)));

  const uyarilar = satirlar.map((s) => {
    const m = sayiOku(s.miktar); const mevcut = akcan.miktar(s.urun_id, depoId);
    if (!sayim && (m === null || !(m > 0))) return 'Miktar girilmeli';
    if (sayim && (sayiOku(s.sayilan) === null || (sayiOku(s.sayilan) ?? -1) < 0)) return 'Sayılan miktar girilmeli';
    if (maliyetli && (sayiOku(s.birim_maliyet) === null || (sayiOku(s.birim_maliyet) ?? -1) < 0)) return 'Birim maliyet girilmeli';
    if ((tur === 'CIK' || tur === 'TRF') && m !== null && m > mevcut) return `Yetersiz stok: bu depoda ${sayi(mevcut)} var`;
    return null;
  });
  const hatali = uyarilar.some((u) => u && !u.startsWith('Yetersiz'));

  const gonder = async (onayDa: boolean) => {
    if (!satirlar.length) { toast('En az bir ürün ekleyin', 'hata'); return; }
    if (tur === 'TRF' && (!hedef || hedef === depoId)) { toast('Transferde farklı bir hedef depo seçin', 'hata'); return; }
    if (hatali) { toast('Eksik bilgileri tamamlayın', 'hata'); return; }
    setBekle(true);
    try {
      const r = await belgeApi.kaydet({
        ...(kayit ? { id: kayit.id, surum: kayit.surum } : {}), istek_anahtari: anahtar, tur, tarih: tarihV, depo_id: depoId, hedef_depo_id: tur === 'TRF' ? hedef : null, aciklama,
        satirlar: satirlar.map((s) => ({ urun_id: s.urun_id, miktar: sayim ? null : sayiOku(s.miktar), sayilan: sayim ? sayiOku(s.sayilan) : null, birim_maliyet: yonetici ? sayiOku(s.birim_maliyet) : null })),
      });
      setKayit({ id: r.id, surum: r.surum });
      if (onayDa) {
        const o = await belgeApi.onayla(r.id, r.surum);
        toast(o.zaten ? `${o.no} zaten onaylıydı` : `${o.no} onaylandı`);
      } else toast(r.tekrar ? 'Bu fiş zaten kaydedilmişti' : 'Taslak kaydedildi; onay bekliyor');
      bitti(r.id);
    } catch (e) { toast((e as Error).message, 'hata'); } finally { setBekle(false); }
  };

  return (
    <Modal acik kapat={kapat} genis="xl" baslik={`${TUR_AD[tur]}${duzenle ? ' · düzenle' : ''}`}
      alt={<>
        <button className="btn-ghost" onClick={kapat} disabled={bekle}>Vazgeç</button>
        <button className="btn-ghost" onClick={() => gonder(false)} disabled={bekle}>{bekle ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />} Taslak kaydet</button>
        {yonetici && <button className="btn-primary" onClick={() => { if (sor('Fiş kaydedilip onaylanacak ve stok hareketleri yazılacak. Onaylanan fiş değiştirilemez, yalnız iptal edilebilir. Devam edilsin mi?')) gonder(true); }} disabled={bekle}><CheckCircle2 size={16} /> Kaydet ve onayla</button>}
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="lbl">{tur === 'TRF' ? 'Kaynak depo' : 'Depo'}</span>
            <select className="inp" value={depoId} onChange={(e) => setDepoId(e.target.value)}>{depo.aktif.map((d) => <option key={d.id} value={d.id}>{depo.ad(d.id)}</option>)}</select></label>
          {tur === 'TRF' && <label className="block"><span className="lbl">Hedef depo</span>
            <select className="inp" value={hedef} onChange={(e) => setHedef(e.target.value)}>{depo.aktif.filter((d) => d.id !== depoId).map((d) => <option key={d.id} value={d.id}>{depo.ad(d.id)}</option>)}</select></label>}
          <label className="block"><span className="lbl">Tarih</span><input type="date" className="inp" max={bugun()} value={tarihV} onChange={(e) => setTarih(e.target.value)} /></label>
          <label className={`block ${tur === 'TRF' ? '' : 'sm:col-span-2'}`}><span className="lbl">Açıklama {tur === 'CIK' && '(neden: fire, servis, numune…)'}</span>
            <input className="inp" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={tur === 'SAY' ? 'ör. A rafı sayımı' : ''} /></label>
        </div>
        {sayim && <p className="rounded bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-500/10 dark:text-violet-200">Sayılan miktarı girin. Fark, onay anındaki AKCAN stokuna göre hesaplanır; sayım sırasında yapılan işlemler sonucu bozmaz.</p>}
        <UrunArama sec={ekle} depoId={depoId} placeholder="Ürün ekle: barkod okut ya da ad / kod / OEM yaz…" />
        {!satirlar.length ? <Bos metin="Henüz ürün eklenmedi." /> : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {satirlar.map((s, i) => {
              const u = urun(s.urun_id); const mevcut = akcan.miktar(s.urun_id, depoId); const uy = uyarilar[i];
              const m = sayiOku(sayim ? s.sayilan : s.miktar);
              return (
                <div key={s.urun_id} className="flex flex-wrap items-center gap-2 p-2.5">
                  <div className="min-w-[12rem] flex-1">
                    <div className="text-sm font-medium leading-tight">{u?.ad ?? s.urun_id}</div>
                    <div className="text-xs text-slate-500">{[u?.kod, `AKCAN ${depo.ad(depoId)}: ${sayi(mevcut)}`, tur === 'TRF' && `${depo.ad(hedef)}: ${sayi(akcan.miktar(s.urun_id, hedef))}`].filter(Boolean).join(' · ')}</div>
                    {uy && <div className={`text-xs ${uy.startsWith('Yetersiz') ? 'font-semibold text-red-600' : 'text-amber-700'}`}>{uy}</div>}
                    {sayim && m !== null && <div className="text-xs text-slate-500">Şu anki fark: <b className={m - mevcut === 0 ? '' : m - mevcut > 0 ? 'text-emerald-700' : 'text-red-600'}>{m - mevcut > 0 ? '+' : ''}{sayi(m - mevcut)}</b></div>}
                  </div>
                  <label className="w-24"><span className="text-[11px] text-slate-500">{sayim ? 'Sayılan' : 'Miktar'}</span>
                    <input className="inp py-1.5 text-right" inputMode="decimal" value={sayim ? s.sayilan : s.miktar} onChange={(e) => degis(i, sayim ? 'sayilan' : 'miktar', e.target.value)} /></label>
                  {(maliyetli || (sayim && yonetici)) && <label className="w-28"><span className="text-[11px] text-slate-500">{sayim ? 'Maliyet (yoksa)' : 'Birim maliyet'}</span>
                    <input className="inp py-1.5 text-right" inputMode="decimal" placeholder="KDV hariç" value={s.birim_maliyet} onChange={(e) => degis(i, 'birim_maliyet', e.target.value)} /></label>}
                  <button className="mt-4 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Satırı çıkar" onClick={() => setSatirlar((l) => l.filter((_, j) => j !== i))}><X size={16} /></button>
                </div>
              );
            })}
          </div>
        )}
        {satirlar.length > 0 && <p className="text-xs text-slate-500">{satirlar.length} kalem{!sayim && ` · ${sayi(satirlar.reduce((t, s) => t + (sayiOku(s.miktar) ?? 0), 0))} adet`}
          {maliyetli && yonetici && ` · ${para(satirlar.reduce((t, s) => t + (sayiOku(s.miktar) ?? 0) * (sayiOku(s.birim_maliyet) ?? 0), 0))} (KDV hariç)`}</p>}
        {!yonetici && <p className="text-xs text-slate-500">Taslak kaydedilince yöneticinin onayına düşer. Stok, onaydan sonra değişir.</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- detay
function FisDetay({ id, akcan, kapat, degisti, duzenle }: {
  id: string; akcan: ReturnType<typeof useAkcan>; kapat: () => void; degisti: () => void; duzenle: (d: { belge: BelgeOzet; satirlar: BelgeSatir[] }) => void;
}) {
  const { db, rol, eposta } = useStore(); const yonetici = rol === 'yonetici'; const depo = useDepolar();
  const [d, setD] = useState<{ belge: BelgeOzet; satirlar: BelgeSatir[]; defter: DefterSatir[] } | null>(null);
  const [bekle, setBekle] = useState(false); const [iptalAcik, setIptalAcik] = useState(false); const [neden, setNeden] = useState('');
  const oku = useCallback(() => belgeApi.detay(id, yonetici).then(setD).catch((e) => { toast((e as Error).message, 'hata'); kapat(); }), [id, yonetici, kapat]);
  useEffect(() => { oku(); }, [oku]);
  if (!d) return <Modal acik kapat={kapat} baslik="Fiş"><p className="text-sm text-slate-500"><Loader2 size={14} className="mr-1 inline animate-spin" />Yükleniyor…</p></Modal>;
  const b = d.belge; const urun = (uid: string) => db.urunler.find((u) => u.id === uid);
  const sayim = b.tur === 'SAY'; const sahip = b.olusturan?.toLowerCase() === eposta?.toLowerCase();
  // onay öncesi önizleme: depo bakiyesi önce → sonra
  const onizleme = b.durum === 'taslak' ? d.satirlar.flatMap((s) => {
    const kaynak = akcan.miktar(s.urun_id, b.depo_id);
    if (b.tur === 'TRF') return [{ s, depo: b.depo_id, once: kaynak, sonra: kaynak - (s.miktar ?? 0) }, { s, depo: b.hedef_depo_id!, once: akcan.miktar(s.urun_id, b.hedef_depo_id), sonra: akcan.miktar(s.urun_id, b.hedef_depo_id) + (s.miktar ?? 0) }];
    const deg = b.tur === 'CIK' ? -(s.miktar ?? 0) : sayim ? (s.sayilan ?? 0) - kaynak : (s.miktar ?? 0);
    return [{ s, depo: b.depo_id, once: kaynak, sonra: kaynak + deg }];
  }) : [];
  const eksi = onizleme.filter((x) => x.sonra < 0);

  const islem = async (f: () => Promise<unknown>, mesaj: string) => {
    setBekle(true);
    try { await f(); toast(mesaj); degisti(); await oku(); } catch (e) { toast((e as Error).message, 'hata'); } finally { setBekle(false); }
  };
  const onayVer = () => {
    if (eksi.length && !sor(`${eksi.length} satır eksi stoka düşüyor görünüyor; onay büyük olasılıkla reddedilecek. Yine de denensin mi?`)) return;
    if (!eksi.length && !sor('Fiş onaylanacak ve stok hareketleri yazılacak. Onaylanan fiş değiştirilemez, yalnız iptal edilebilir. Onaylıyor musunuz?')) return;
    islem(async () => { const o = await belgeApi.onayla(b.id, b.surum); if (o.zaten) toast(`${o.no} zaten onaylıydı`); }, 'Fiş onaylandı');
  };
  const yazdir = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const satir = d.satirlar.map((s) => `<tr><td>${s.sira}</td><td>${(urun(s.urun_id)?.ad ?? '').replace(/</g, '&lt;')}</td><td>${urun(s.urun_id)?.kod ?? ''}</td><td style="text-align:right">${sayim ? `${s.sayilan ?? ''} (sistem ${s.sistem ?? '—'})` : s.miktar ?? ''}</td></tr>`).join('');
    w.document.write(`<html><head><title>${b.no ?? 'Taslak'}</title><style>body{font:13px system-ui;margin:24px}td,th{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}table{border-collapse:collapse;width:100%}</style></head><body>
      <h2>${TUR_AD[b.tur]} · ${b.no ?? 'TASLAK'}</h2><p>${tarih(b.tarih)} · ${depo.ad(b.depo_id)}${b.hedef_depo_id ? ' → ' + depo.ad(b.hedef_depo_id) : ''} · ${DURUM_AD[b.durum]}<br>${(b.aciklama ?? '').replace(/</g, '&lt;')}</p>
      <table><tr><th>#</th><th>Ürün</th><th>Kod</th><th style="text-align:right">${sayim ? 'Sayılan' : 'Miktar'}</th></tr>${satir}</table>
      <p>Hazırlayan: ${b.olusturan}${b.onaylayan ? ' · Onaylayan: ' + b.onaylayan : ''}</p><p style="color:#c00">DENEME ORTAMI</p></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <Modal acik kapat={kapat} genis="xl" baslik={`${TUR_KISA[b.tur]} · ${b.no ?? 'Taslak'}`}
      alt={<div className="flex w-full flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={yazdir}><Printer size={16} /> Yazdır</button>
        <span className="flex-1" />
        {b.durum === 'taslak' && (yonetici || sahip) && <>
          <button className="btn-ghost text-red-600" disabled={bekle} onClick={() => { if (sor('Taslak silinsin mi? (Stoka etkisi yoktu.)')) islem(async () => { await belgeApi.taslakSil(b.id); kapat(); }, 'Taslak silindi'); }}><Trash2 size={16} /> Sil</button>
          <button className="btn-ghost" disabled={bekle} onClick={() => duzenle({ belge: b, satirlar: d.satirlar })}><Pencil size={16} /> Düzenle</button></>}
        {b.durum === 'taslak' && yonetici && <button className="btn-primary" disabled={bekle} onClick={onayVer}>{bekle ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Onayla</button>}
        {b.durum === 'onayli' && yonetici && b.tur !== 'ACL' && !iptalAcik && <button className="btn-danger" disabled={bekle} onClick={() => setIptalAcik(true)}><Ban size={16} /> İptal et</button>}
        {b.durum === 'onayli' && yonetici && b.tur === 'ACL' && !iptalAcik && <button className="btn-ghost text-red-600" disabled={bekle} onClick={() => setIptalAcik(true)}><Ban size={16} /> İptal et</button>}
      </div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Bilgi e="Durum" v={<span className={`rozet ${DURUM_RENK[b.durum]}`}>{DURUM_AD[b.durum]}</span>} />
          <Bilgi e="Depo" v={<>{depo.ad(b.depo_id)}{b.hedef_depo_id && <> → {depo.ad(b.hedef_depo_id)}</>}</>} />
          <Bilgi e="Belge tarihi" v={tarih(b.tarih)} />
          <Bilgi e="Kalem / adet" v={`${b.satir} / ${sayi(b.toplam_miktar)}`} />
        </div>
        <div className="text-xs text-slate-500">
          Hazırlayan {b.olusturan} · {tarihSaat(b.olusturma)}{b.guncelleme && ` · son değişiklik ${kisaEposta(b.guncelleyen)} ${tarihSaat(b.guncelleme)}`}
          {b.onay_zaman && <> · <b>Onaylayan {b.onaylayan} · {tarihSaat(b.onay_zaman)}</b></>}
          {b.iptal_zaman && <> · <b className="text-red-600">İptal eden {b.iptal_eden} · {tarihSaat(b.iptal_zaman)}</b></>}
        </div>
        {b.aciklama && <p className="text-sm">{b.aciklama}</p>}
        {b.iptal_nedeni && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">İptal nedeni: {b.iptal_nedeni}</p>}

        {iptalAcik && <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="mb-2 text-sm text-red-800 dark:text-red-200">İptal, her hareketin tam tersini aynı maliyetle deftere yazar; fiş ve asıl hareketler silinmez. İptal stoku eksiye düşürecekse reddedilir.</p>
          <input className="inp mb-2" autoFocus placeholder="İptal nedeni (zorunlu)" value={neden} onChange={(e) => setNeden(e.target.value)} />
          <div className="flex gap-2"><button className="btn-danger" disabled={bekle || neden.trim().length < 5} onClick={() => islem(async () => { await belgeApi.iptal(b.id, neden); setIptalAcik(false); }, 'Fiş iptal edildi; ters hareketler yazıldı')}><Undo2 size={16} /> İptali onayla</button>
            <button className="btn-ghost" onClick={() => setIptalAcik(false)}>Vazgeç</button></div>
        </div>}

        <div>
          <div className="mb-1 text-sm font-semibold">Satırlar</div>
          <div className="overflow-x-auto"><table className="tbl text-sm">
            <thead><tr><th>Ürün</th><th className="!text-right">{sayim ? 'Sayılan' : 'Miktar'}</th>{sayim && <><th className="!text-right">Sistem</th><th className="!text-right">Fark</th></>}
              {yonetici && (b.tur === 'GIR' || b.tur === 'ACL' || sayim) && <th className="!text-right">Birim maliyet</th>}
              {b.durum === 'taslak' && <th>Önizleme (AKCAN)</th>}</tr></thead>
            <tbody>{d.satirlar.map((s) => {
              const on = onizleme.filter((x) => x.s.id === s.id);
              return (<tr key={s.id}>
                <td className="min-w-[12rem]"><UrunLink id={s.urun_id}>{urun(s.urun_id)?.ad ?? s.urun_id}</UrunLink><div className="text-xs text-slate-500">{urun(s.urun_id)?.kod}</div></td>
                <td className="text-right">{sayi((sayim ? s.sayilan : s.miktar) ?? 0)}</td>
                {sayim && <><td className="text-right">{s.sistem === null ? '—' : sayi(s.sistem)}</td><td className={`text-right font-semibold ${(s.fark ?? 0) < 0 ? 'text-red-600' : (s.fark ?? 0) > 0 ? 'text-emerald-700' : ''}`}>{s.fark === null ? '—' : `${s.fark > 0 ? '+' : ''}${sayi(s.fark)}`}</td></>}
                {yonetici && (b.tur === 'GIR' || b.tur === 'ACL' || sayim) && <td className="text-right">{s.birim_maliyet === null ? '—' : para(s.birim_maliyet)}</td>}
                {b.durum === 'taslak' && <td className="whitespace-nowrap text-xs">{on.map((x, i) => <div key={i} className={x.sonra < 0 ? 'font-semibold text-red-600' : ''}>{depo.ad(x.depo)}: {sayi(x.once)} → {sayi(x.sonra)}{x.sonra < 0 && ' (eksi!)'}</div>)}</td>}
              </tr>);
            })}</tbody></table></div>
        </div>

        {d.defter.length > 0 && <div>
          <div className="mb-1 text-sm font-semibold">Stok hareketleri <span className="text-xs font-normal text-slate-500">(stok defteri; değiştirilemez)</span></div>
          <HareketTablosu l={d.defter} yonetici={yonetici} urunAdi={(u) => urun(u)?.ad ?? u} depoAdi={depo.ad} belgeNo={false} />
        </div>}
      </div>
    </Modal>
  );
}

const Bilgi = ({ e, v }: { e: string; v: ReactNode }) => <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><div className="text-[11px] text-slate-500">{e}</div><div className="font-semibold">{v}</div></div>;

// ---------------------------------------------------------------- karşılaştırma
function KarsilastirmaSekmesi({ akcan }: { akcan: ReturnType<typeof useAkcan> }) {
  const { db } = useStore(); const depo = useDepolar();
  const [depoId, setDepoId] = useState(''); const [yalnizFark, setYalnizFark] = useState(true); const [q, setQ] = useState(''); const [goster, setGoster] = useState(100);
  const hizmet = useMemo(() => new Set([...akcan.turler].filter(([, t]) => t === 'hizmet').map(([u]) => u)), [akcan.turler]);
  const tum = useMemo(() => (akcan.bakiye ? karsilastir(akcan.bakiye, db.urun_depo_stok, hizmet, new Set(depo.aktif.map((d) => d.id))) : null), [akcan.bakiye, db.urun_depo_stok, hizmet, depo.aktif]);
  const ad = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  if (!tum) return <p className="text-sm text-slate-500"><Loader2 size={14} className="mr-1 inline animate-spin" />Karşılaştırılıyor…</p>;
  const kapsam = tum.filter((x) => !depoId || x.depo_id === depoId);
  const ozet = { ayni: kapsam.filter((x) => x.fark === 0 && (x.akcan || x.bh)).length, farkli: kapsam.filter((x) => x.fark !== 0).length,
    akcanYok: kapsam.filter((x) => x.akcan === 0 && x.bh !== 0).length, bhYok: kapsam.filter((x) => x.bh === 0 && x.akcan !== 0).length };
  const qq = q.trim().toLocaleUpperCase('tr');
  const l = kapsam.filter((x) => (!yalnizFark || x.fark !== 0) && (x.akcan || x.bh) && (!qq || `${ad.get(x.urun_id)?.ad ?? ''} ${ad.get(x.urun_id)?.kod ?? ''}`.toLocaleUpperCase('tr').includes(qq)))
    .sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark));
  const akcanBos = (akcan.bakiye ?? []).every((x) => !x.miktar);
  return (
    <div>
      {akcanBos && <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">AKCAN stoku henüz boş: açılış fişi onaylanmadan her ürün "farklı" görünür. Yönetici "Açılış" sekmesinden BizimHesap stokundan açılış taslağı hazırlayabilir.</p>}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Bilgi e="Aynı" v={sayi(ozet.ayni)} /><Bilgi e="Farklı" v={<span className={ozet.farkli ? 'text-red-600' : ''}>{sayi(ozet.farkli)}</span>} />
        <Bilgi e="BizimHesap'ta var, AKCAN'da yok" v={sayi(ozet.akcanYok)} /><Bilgi e="AKCAN'da var, BizimHesap'ta yok" v={sayi(ozet.bhYok)} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="inp w-auto" value={depoId} onChange={(e) => setDepoId(e.target.value)}><option value="">Tüm depolar</option>{depo.aktif.map((d) => <option key={d.id} value={d.id}>{depo.ad(d.id)}</option>)}</select>
        <input className="inp w-48 flex-1" placeholder="Ürün adı ya da kodu…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={yalnizFark} onChange={(e) => setYalnizFark(e.target.checked)} /> Yalnız farklı olanlar</label>
      </div>
      <p className="mb-2 text-xs text-slate-500">Hizmet ürünleri karşılaştırmaya girmez. BizimHesap stoku her dakika eşitlenir; AKCAN stoku yalnız onaylı fişlerle değişir.</p>
      {!l.length ? <Bos metin="Fark yok." /> : <>
        <div className="overflow-x-auto"><table className="tbl text-sm">
          <thead><tr><th>Ürün</th><th>Depo</th><th className="!text-right">AKCAN</th><th className="!text-right">BizimHesap</th><th className="!text-right">Fark</th></tr></thead>
          <tbody>{l.slice(0, goster).map((x) => (
            <tr key={x.urun_id + x.depo_id}>
              <td className="min-w-[12rem]"><UrunLink id={x.urun_id}>{ad.get(x.urun_id)?.ad ?? x.urun_id}</UrunLink><div className="text-xs text-slate-500">{ad.get(x.urun_id)?.kod}</div></td>
              <td>{depo.ad(x.depo_id)}</td><td className="text-right">{sayi(x.akcan)}</td><td className="text-right">{sayi(x.bh)}</td>
              <td className={`text-right font-semibold ${x.fark < 0 ? 'text-red-600' : x.fark > 0 ? 'text-emerald-700' : ''}`}>{x.fark > 0 ? '+' : ''}{sayi(x.fark)}</td>
            </tr>))}</tbody></table></div>
        {l.length > goster && <button className="btn-ghost mt-2 w-full" onClick={() => setGoster((g) => g + 200)}>Daha fazla ({l.length - goster} kaldı)</button>}
      </>}
    </div>
  );
}

// ---------------------------------------------------------------- ürün türü
function UrunTuruSekmesi({ yenile, sayac }: { yenile: () => void; sayac: number }) {
  const [l, setL] = useState<UrunTuruSatir[] | null>(null); const [filtre, setFiltre] = useState<'belirsiz' | 'hizmet' | 'stoklu'>('belirsiz');
  const [secili, setSecili] = useState<Set<string>>(new Set()); const [bekle, setBekle] = useState(false);
  useEffect(() => { belgeApi.turKontrol().then(setL).catch((e) => toast((e as Error).message, 'hata')); }, [sayac]);
  if (!l) return <p className="text-sm text-slate-500"><Loader2 size={14} className="mr-1 inline animate-spin" />Yükleniyor…</p>;
  const g = l.filter((x) => (filtre === 'belirsiz' ? !x.tur : x.tur === filtre));
  const belirle = async (ids: string[], tur: 'stoklu' | 'hizmet') => {
    if (!ids.length) return;
    if (!sor(`${ids.length} ürün ${tur === 'hizmet' ? 'HİZMET' : 'STOKLU ÜRÜN'} olarak işaretlenecek.${tur === 'hizmet' ? ' Hizmet ürünleri stok fişlerine, sayıma ve stok defterine giremez; kartları ve satış geçmişleri korunur.' : ''} Devam edilsin mi?`)) return;
    setBekle(true);
    try { await belgeApi.turBelirle(ids, tur); toast('Ürün türü kaydedildi'); setSecili(new Set()); yenile(); } catch (e) { toast((e as Error).message, 'hata'); } finally { setBekle(false); }
  };
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Adında ya da kategorisinde işçilik, hizmet, yıkama gibi sözcükler geçen ürünler kendiliğinden sınıflandırılmaz. Türü belirlenene kadar stok fişlerine ve açılışa alınmazlar. Yanlış adaylar (ör. "far yıkama robotu") için <b>Stoklu ürün</b> seçin.</p>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(['belirsiz', 'hizmet', 'stoklu'] as const).map((f) => (
          <button key={f} onClick={() => { setFiltre(f); setSecili(new Set()); }} className={`rounded-full border px-3 py-1 text-xs ${filtre === f ? 'border-marka-500 bg-marka-50 font-semibold text-marka-700 dark:bg-slate-800' : 'border-slate-300 text-slate-600 dark:border-slate-700'}`}>
            {f === 'belirsiz' ? 'Karar bekleyen' : f === 'hizmet' ? 'Hizmet' : 'Stoklu (onaylanmış)'} <span className="text-slate-400">{l.filter((x) => (f === 'belirsiz' ? !x.tur : x.tur === f)).length}</span></button>))}
        <span className="flex-1" />
        <button className="btn-ghost px-3 py-1.5 text-sm" disabled={bekle || !secili.size} onClick={() => belirle([...secili], 'hizmet')}>Seçilenler: Hizmet</button>
        <button className="btn-ghost px-3 py-1.5 text-sm" disabled={bekle || !secili.size} onClick={() => belirle([...secili], 'stoklu')}>Seçilenler: Stoklu ürün</button>
      </div>
      <div className="mb-3"><UrunArama sec={(u) => belirle([u.id], 'hizmet')} placeholder="Listede olmayan bir ürünü HİZMET yapmak için arayın…" /></div>
      {!g.length ? <Bos metin="Bu listede ürün yok." /> : (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {g.map((x) => (
            <div key={x.urun_id} className="flex flex-wrap items-center gap-2 p-2.5">
              <input type="checkbox" className="h-5 w-5" checked={secili.has(x.urun_id)} onChange={(e) => setSecili((s) => { const y = new Set(s); if (e.target.checked) y.add(x.urun_id); else y.delete(x.urun_id); return y; })} />
              <div className="min-w-[12rem] flex-1"><div className="text-sm font-medium"><UrunLink id={x.urun_id}>{x.ad}</UrunLink></div>
                <div className="text-xs text-slate-500">{[x.kod, x.kategori, `BizimHesap stoku ${sayi(x.bh_stok)}`, x.akcan_stok ? `AKCAN stoku ${sayi(x.akcan_stok)}` : null, x.belirleyen && `${kisaEposta(x.belirleyen)} · ${tarihSaat(x.zaman)}`].filter(Boolean).join(' · ')}</div></div>
              <div className="flex gap-1">
                <button className={`rounded-md border px-2.5 py-1.5 text-xs ${x.tur === 'hizmet' ? 'border-violet-500 bg-violet-50 font-semibold text-violet-800' : 'border-slate-300'}`} disabled={bekle || x.tur === 'hizmet'} onClick={() => belirle([x.urun_id], 'hizmet')}>Hizmet</button>
                <button className={`rounded-md border px-2.5 py-1.5 text-xs ${x.tur === 'stoklu' ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-300'}`} disabled={bekle || x.tur === 'stoklu'} onClick={() => belirle([x.urun_id], 'stoklu')}>Stoklu ürün</button>
              </div>
            </div>))}
        </div>)}
    </div>
  );
}

// ---------------------------------------------------------------- açılış
function AcilisSekmesi({ yenile, ac, git }: { yenile: () => void; ac: (id: string) => void; git: (s: Sayfa) => void }) {
  const depo = useDepolar();
  const [depoId, setDepoId] = useState(depo.aktif[0]?.id ?? ''); const [istisna, setIstisna] = useState<Istisna[] | null>(null);
  const [bekle, setBekle] = useState(false); const [taslak, setTaslak] = useState<BelgeOzet[]>([]); const [ilerleme, setIlerleme] = useState<string | null>(null);
  const oku = useCallback(() => {
    setIstisna(null);
    belgeApi.acilisIstisnalari(depoId).then(setIstisna).catch((e) => toast((e as Error).message, 'hata'));
    belgeApi.liste('taslak', 500).then((l) => setTaslak(l.filter((b) => b.tur === 'ACL'))).catch(() => undefined);
  }, [depoId]);
  useEffect(() => { if (depoId) oku(); }, [oku, depoId]);
  const gruplar = useMemo(() => { const m = new Map<string, number>(); for (const x of istisna ?? []) m.set(x.neden, (m.get(x.neden) ?? 0) + 1); return [...m]; }, [istisna]);
  const olustur = async () => {
    if (!sor(`${depo.ad(depoId)} için BizimHesap stokundan açılış TASLAĞI hazırlanacak (onaylanmaz). Maliyet: ürün kartındaki alış fiyatı (KDV hariç). İstisnalar alınmaz. Devam edilsin mi?`)) return;
    setBekle(true);
    try { const r = await belgeApi.acilisOlustur(depoId); toast(r.satir ? `${r.belge} açılış taslağı, ${r.satir} satır hazırlandı` : 'Alınacak yeni kalem yok'); yenile(); oku(); } catch (e) { toast((e as Error).message, 'hata'); } finally { setBekle(false); }
  };
  const hepsiniOnayla = async () => {
    const l = taslak.filter((b) => b.depo_id === depoId);
    if (!l.length || !sor(`${l.length} açılış taslağı sırayla onaylanacak. Devam edilsin mi?`)) return;
    setBekle(true);
    try { for (let i = 0; i < l.length; i++) { setIlerleme(`${i + 1} / ${l.length}`); await belgeApi.onayla(l[i].id, l[i].surum); } toast('Açılış fişleri onaylandı'); }
    catch (e) { toast((e as Error).message, 'hata'); } finally { setBekle(false); setIlerleme(null); yenile(); oku(); }
  };
  const depoTaslak = taslak.filter((b) => b.depo_id === depoId);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">Açılış, AKCAN stokunu BizimHesap'taki o anki depo stokuyla başlatır. Taslak 300'er satırlık fişlere bölünür; inceleyip onaylayın. Maliyet uydurulmaz: maliyeti sıfır, eksik ya da satıştan yüksek olan ürünler, eksi stoklar ve hizmet ürünleri aşağıdaki istisna listesinde kalır.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="inp w-auto" value={depoId} onChange={(e) => setDepoId(e.target.value)}>{depo.aktif.map((d) => <option key={d.id} value={d.id}>{depo.ad(d.id)}</option>)}</select>
        <button className="btn-primary" disabled={bekle} onClick={olustur}>{bekle ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />} Açılış taslağı hazırla</button>
        {depoTaslak.length > 0 && <button className="btn-ghost" disabled={bekle} onClick={hepsiniOnayla}><CheckCircle2 size={16} /> {ilerleme ?? `Bu depodaki ${depoTaslak.length} açılış taslağını onayla`}</button>}
        <button className="btn-ghost" onClick={() => git('stokfis/karsilastirma' as Sayfa)}>Karşılaştırmaya git</button>
      </div>
      {depoTaslak.length > 0 && <div className="flex flex-wrap gap-2">{depoTaslak.map((b) => <button key={b.id} className="rozet bg-amber-50 text-amber-800 hover:underline" onClick={() => ac(b.id)}>Taslak · {b.satir} satır</button>)}</div>}
      <div>
        <div className="mb-1 text-sm font-semibold">İstisna listesi — açılışa alınmayanlar</div>
        {!istisna ? <p className="text-sm text-slate-500"><Loader2 size={14} className="mr-1 inline animate-spin" />Yükleniyor…</p> : !istisna.length ? <Bos metin="İstisna yok." /> : <>
          <div className="mb-2 flex flex-wrap gap-1.5">{gruplar.map(([n, c]) => <span key={n} className="rozet bg-slate-100 text-slate-700">{n}: {c}</span>)}</div>
          <div className="max-h-[28rem] overflow-auto"><table className="tbl text-xs">
            <thead><tr><th>Ürün</th><th className="!text-right">BizimHesap stoku</th><th className="!text-right">Alış (KDV hariç)</th><th className="!text-right">Satış (KDV hariç)</th><th>Neden</th></tr></thead>
            <tbody>{istisna.map((x) => <tr key={x.urun_id}><td className="min-w-[12rem]"><UrunLink id={x.urun_id}>{x.ad}</UrunLink> <span className="text-slate-400">{x.kod}</span></td>
              <td className="text-right">{sayi(x.bh_miktar)}</td><td className="text-right">{para(x.alis_net)}</td><td className="text-right">{para(x.satis_net)}</td><td>{x.neden}</td></tr>)}</tbody></table></div>
        </>}
      </div>
    </div>
  );
}
