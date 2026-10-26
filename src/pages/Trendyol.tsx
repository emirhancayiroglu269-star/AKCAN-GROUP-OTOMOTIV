import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Info, PlugZap, RefreshCw } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type TyGonderim, type TySiparis, type TyVeri } from '../lib/backend';
import { IPTAL_RE, TY_VARSAYILAN, komisyonOranlari, maliyet, satirKomisyon, tyHedefFiyat, tyKar, tyOneriler, type TyVarsayim } from '../lib/trendyol';
import { sonAlislar } from '../lib/analiz2';
import { ara, gunu, para, parse, sayi, tarihSaat } from '../lib/format';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';

type Sekme = 'siparis' | 'ilan' | 'stok' | 'oneri' | 'ayar';
const csvIndir = (ad: string, satirlar: (string | number | null | undefined)[][]) => {
  const icerik = satirlar.map((a) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = ad; el.click();
};
const DURUM_AD: Record<string, string> = { Created: 'Yeni', Picking: 'Hazırlanıyor', Invoiced: 'Faturalandı', Shipped: 'Kargoda', Delivered: 'Teslim edildi', Cancelled: 'İptal', UnDelivered: 'Teslim edilemedi', Returned: 'İade', AtCollectionPoint: 'Teslim noktasında', UnSupplied: 'Tedarik edilemedi', Awaiting: 'Bekliyor', Verified: 'Onaylandı' };
const durumRenk = (d: string | null) => !d ? 'bg-slate-100 text-slate-600' : IPTAL_RE.test(d) ? 'bg-red-50 text-red-700' : /Delivered/.test(d) ? 'bg-emerald-50 text-emerald-700' : /Shipped|AtCollection/.test(d) ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800';

export default function TrendyolSayfa() {
  const { db, calistir } = useStore();
  const [veri, setVeri] = useState<TyVeri | null>(null);
  const [yuk, setYuk] = useState(false);
  const [sekme, setSekme] = useState<Sekme>('siparis');
  const v: TyVarsayim = { ...TY_VARSAYILAN, ...(db.ayarlar.trendyol ?? {}) };
  const oku = async () => { setYuk(true); try { setVeri(await backend.tyOku(90)); } catch (e) { toast(`Trendyol verisi okunamadı: ${(e as Error).message}`, 'hata'); } finally { setYuk(false); } };
  useEffect(() => { oku(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const esitle = async () => { setYuk(true); try { const r = await backend.tyCalistir('esitle'); if (r.ok === false) toast(String(r.hata), 'hata'); else toast(`Eşitlendi: ${sayi(Number(r.siparis) || 0)} sipariş paketi${r.ilan != null ? `, ${sayi(Number(r.ilan))} ilan` : ''}`); await oku(); } catch (e) { toast((e as Error).message, 'hata'); setYuk(false); } };
  const test = () => calistir(async () => { const r = await backend.tyCalistir('test'); if (r.ok === false) throw new Error(String(r.hata)); toast(`Bağlantı tamam: Trendyol'da ${sayi(Number(r.ilanSayisi) || 0)} onaylı ilan`); });
  const d = veri?.durum;
  const sb = (k: Sekme, ad: string, n?: number) => <button key={k} onClick={() => setSekme(k)} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${sekme === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}>{ad}{n !== undefined && <span className="ml-1 opacity-60">{n}</span>}</button>;

  return (
    <div>
      <SayfaBaslik baslik="Trendyol" alt="Siparişler, ilanlar, kâr hedefli fiyat ve öneriler · şimdilik yalnız okur, Trendyol'a bir şey yazmaz">
        <button className="btn-ghost" onClick={test}><PlugZap size={16} /> Bağlantıyı test et</button>
        <button className="btn-primary" onClick={esitle} disabled={yuk}><RefreshCw size={16} className={yuk ? 'animate-spin' : ''} /> Şimdi eşitle</button>
      </SayfaBaslik>
      {d && (d.son_hata ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div><b>Trendyol bağlantısı çalışmıyor:</b> {d.son_hata}{/eksik/i.test(d.son_hata) && <div className="mt-1 text-xs">Trendyol satıcı paneli → Hesap Bilgilerim → Entegrasyon Bilgileri'ndeki Satıcı ID, API Key ve API Secret'ı Supabase → Edge Functions → Secrets'e <code>TRENDYOL_SATICI_ID</code>, <code>TRENDYOL_API_KEY</code>, <code>TRENDYOL_API_SECRET</code> adlarıyla girin.</div>}</div></div>
      ) : (d.son_siparis && <div className="mb-4 flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={14} className="text-emerald-600" /> Son eşitleme: siparişler {tarihSaat(d.son_siparis)}{d.son_urun ? ` · ilanlar ${tarihSaat(d.son_urun)}` : ''}</div>))}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
        {sb('siparis', 'Siparişler', veri?.siparisler.length)}{sb('ilan', 'İlanlar & fiyat', veri?.urunler.length)}{sb('stok', 'Stok gönderimi')}{sb('oneri', "Trendyol'a uygun ürünler")}{sb('ayar', 'Hesap varsayımları')}
      </div>
      {!veri ? <div className="card p-6 text-center text-sm text-slate-500">Yükleniyor…</div>
        : sekme === 'siparis' ? <Siparisler veri={veri} v={v} />
        : sekme === 'ilan' ? <Ilanlar veri={veri} v={v} />
        : sekme === 'stok' ? <StokGonderimi veri={veri} yenile={oku} />
        : sekme === 'oneri' ? <Oneriler veri={veri} v={v} />
        : <Varsayimlar v={v} />}
    </div>
  );
}

/* ───────── Siparişler ───────── */
function Siparisler({ veri, v }: { veri: TyVeri; v: TyVarsayim }) {
  const { db } = useStore();
  const [gun, setGun] = useState(30); const [q, setQ] = useState(''); const [durum, setDurum] = useState('');
  const urunBarkod = useMemo(() => { const m = new Map<string, (typeof db.urunler)[number]>(); for (const t of veri.urunler) if (t.urun_id) { const u = db.urunler.find((x) => x.id === t.urun_id); if (u) m.set(t.barkod, u); } for (const u of db.urunler) if (u.barkod && !m.has(u.barkod)) m.set(u.barkod, u); return m; }, [db.urunler, veri.urunler]);
  const son = useMemo(() => sonAlislar(db), [db]);
  const sinir = Date.now() - gun * 864e5;
  const donem = veri.siparisler.filter((s) => s.tarih && new Date(s.tarih).getTime() >= sinir);
  const hesap = (s: TySiparis) => {
    let komisyon = 0, maliyetT = 0, maliyetVar = true, ciro = 0;
    for (const l of s.satirlar) {
      const tutar = (l.birim_fiyat ?? 0) * l.adet - (l.indirim ?? 0); ciro += tutar; komisyon += satirKomisyon(l) ?? tutar * v.komisyon / 100;
      const u = l.barkod ? urunBarkod.get(l.barkod) : undefined; const a = u ? maliyet(db, u, son) : 0; if (a > 0) maliyetT += a * l.adet; else maliyetVar = false;
    }
    const kdv = s.satirlar[0]?.kdv && s.satirlar[0].kdv <= 30 ? s.satirlar[0].kdv : 20;
    const net = ciro / (1 + kdv / 100) - (komisyon + v.kargo + v.hizmet) / 1.2 - ciro * v.stopaj / 100 - maliyetT;
    return { ciro, komisyon, kar: maliyetVar ? net : null, iptal: IPTAL_RE.test(s.durum ?? '') };
  };
  const satirlar = donem.map((s) => ({ s, h: hesap(s) })).filter((x) => (!durum || x.s.durum === durum) && ara(q, x.s.siparis_no, x.s.sehir, x.s.kargo_takip, ...x.s.satirlar.map((l) => l.ad ?? '')));
  const gecerli = donem.map((s) => ({ s, h: hesap(s) })).filter((x) => !x.h.iptal);
  const ciro = gecerli.reduce((t, x) => t + x.h.ciro, 0), kom = gecerli.reduce((t, x) => t + x.h.komisyon, 0), kar = gecerli.reduce((t, x) => t + (x.h.kar ?? 0), 0);
  const iptal = donem.length - gecerli.length;
  const durumlar = [...new Set(donem.map((s) => s.durum).filter(Boolean))] as string[];
  const urunSay = useMemo(() => { const m = new Map<string, { ad: string; adet: number; ciro: number }>(); for (const x of gecerli) for (const l of x.s.satirlar) { const k = l.barkod ?? l.ad ?? '?'; const y = m.get(k) ?? { ad: l.ad ?? k, adet: 0, ciro: 0 }; y.adet += l.adet; y.ciro += (l.birim_fiyat ?? 0) * l.adet - (l.indirim ?? 0); m.set(k, y); } return [...m.values()].sort((a, b) => b.ciro - a.ciro).slice(0, 8); }, [gecerli]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="inp w-36" value={gun} onChange={(e) => setGun(Number(e.target.value))}>{[7, 14, 30, 90].map((n) => <option key={n} value={n}>Son {n} gün</option>)}</select>
        <select className="inp w-44" value={durum} onChange={(e) => setDurum(e.target.value)}><option value="">Tüm durumlar</option>{durumlar.map((x) => <option key={x} value={x}>{DURUM_AD[x] ?? x}</option>)}</select>
        <input className="inp max-w-xs" placeholder="Sipariş no, ürün, şehir…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-ghost ml-auto" disabled={!satirlar.length} onClick={() => csvIndir(`trendyol-siparis-${gunu()}.csv`, [['Tarih', 'Sipariş no', 'Durum', 'Şehir', 'Ürünler', 'Tutar', 'Komisyon', 'Tahmini net kâr', 'Kargo', 'Takip no'], ...satirlar.map(({ s, h }) => [s.tarih ? tarihSaat(s.tarih) : '', s.siparis_no, DURUM_AD[s.durum ?? ''] ?? s.durum, s.sehir, s.satirlar.map((l) => `${l.adet}× ${l.ad}`).join(' | '), h.ciro.toFixed(2), h.komisyon.toFixed(2), h.kar?.toFixed(2), s.kargo_firma, s.kargo_takip])])}><Download size={16} /> CSV</button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Trendyol satışı" deger={para(ciro)} alt={`${sayi(gecerli.length)} sipariş · iptal/iade hariç`} />
        <Kpi etiket="Komisyon" deger={para(kom)} alt={ciro ? `Satışın %${((kom / ciro) * 100).toFixed(1)}'i` : ''} renk="amber" />
        <Kpi etiket="Tahmini net kâr" deger={para(kar)} alt="Komisyon, kargo, hizmet bedeli, stopaj ve alış düşülmüş (KDV hariç)" renk={kar >= 0 ? 'green' : 'red'} />
        <Kpi etiket="İptal / iade" deger={sayi(iptal)} alt={donem.length ? `Siparişlerin %${((iptal / donem.length) * 100).toFixed(0)}'i` : ''} renk={iptal ? 'red' : 'slate'} />
      </div>
      {urunSay.length > 0 && <div className="mb-4 flex flex-wrap gap-1.5 text-xs"><span className="text-slate-500">En çok satanlar:</span>{urunSay.map((x) => <span key={x.ad} className="rounded-full bg-white px-2 py-0.5 dark:bg-slate-900">{x.ad.length > 40 ? x.ad.slice(0, 38) + '…' : x.ad} <b>{sayi(x.adet)}</b></span>)}</div>}
      <div className="card">
        {satirlar.length === 0 ? <Bos metin="Bu dönemde Trendyol siparişi yok (ya da bağlantı henüz kurulmadı)." /> : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Tarih</th><th>Sipariş</th><th>Ürünler</th><th className="text-right">Tutar</th><th className="text-right">Komisyon</th><th className="text-right">Net kâr</th><th>Kargo</th></tr></thead>
              <tbody>{satirlar.slice(0, 500).map(({ s, h }) => (
                <tr key={s.paket_id} className={h.iptal ? 'opacity-60' : ''}>
                  <td className="whitespace-nowrap text-xs">{s.tarih ? tarihSaat(s.tarih) : '—'}</td>
                  <td><div className="font-mono text-xs">{s.siparis_no}</div><span className={`rozet ${durumRenk(s.durum)}`}>{DURUM_AD[s.durum ?? ''] ?? s.durum}</span>{s.sehir && <span className="ml-1 text-[11px] text-slate-400">{s.sehir}</span>}</td>
                  <td className="text-xs">{s.satirlar.map((l, i) => { const u = l.barkod ? urunBarkod.get(l.barkod) : undefined; return <div key={i}>{l.adet}× {u ? <UrunLink id={u.id}>{l.ad}</UrunLink> : <span title="Bizde eşleşen ürün yok">{l.ad} <span className="text-amber-600">⚠</span></span>}</div>; })}</td>
                  <td className="text-right font-medium">{para(h.ciro)}</td>
                  <td className="text-right text-amber-700">{para(h.komisyon)}</td>
                  <td className={`text-right font-semibold ${h.kar === null ? 'text-slate-300' : h.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{h.kar === null ? '—' : para(h.kar)}</td>
                  <td className="text-xs text-slate-500">{s.kargo_firma}{s.kargo_takip ? <div className="font-mono">{s.kargo_takip}</div> : null}</td>
                </tr>))}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Net kâr tahminidir: satış (KDV hariç) − komisyon − kargo − hizmet bedeli (KDV'leri indirilerek) − stopaj − alış maliyeti. Kargo ve hizmet bedeli "Hesap varsayımları" sekmesindeki değerlerdir; kesin rakam Trendyol hakediş raporundadır. ⚠ işaretli ürünlerin bizde barkod/stok kodu eşleşmesi yok, maliyeti bilinmediği için kâr hesaplanmaz.</p>
    </div>
  );
}

/* ───────── İlanlar & fiyat ───────── */
type IlanFiltre = 'hepsi' | 'zarar' | 'hedefAlti' | 'stokFark' | 'eslesmeyen' | 'kapali';
function Ilanlar({ veri, v }: { veri: TyVeri; v: TyVarsayim }) {
  const { db } = useStore();
  const [f, setF] = useState<IlanFiltre>('hepsi'); const [q, setQ] = useState('');
  const urun = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  const kom = useMemo(() => komisyonOranlari(veri.siparisler), [veri.siparisler]);
  const son = useMemo(() => sonAlislar(db), [db]);
  const satirlar = useMemo(() => veri.urunler.map((t) => {
    const u = t.urun_id ? urun.get(t.urun_id) : undefined; const k = kom.get(t.barkod) ?? v.komisyon; const a = u ? maliyet(db, u, son) : 0; const kdv = t.kdv ?? u?.kdv ?? 20;
    const simdi = t.satis_fiyati && a > 0 ? tyKar(t.satis_fiyati, a, kdv, v, k) : null; const hedef = a > 0 ? tyHedefFiyat(a, kdv, v, k) : null;
    const stokFark = u && t.stok !== null ? Math.max(0, u.stok) - t.stok : null;
    return { t, u, k, a, simdi, hedef, stokFark, gercekKom: kom.has(t.barkod) };
  }), [veri, urun, kom, son, db, v.komisyon, v.kargo, v.hizmet, v.stopaj, v.hedef_marj]); // eslint-disable-line react-hooks/exhaustive-deps
  const uygun = (x: (typeof satirlar)[number], k: IlanFiltre) => k === 'hepsi' ? true : k === 'zarar' ? !!x.simdi && x.simdi.kar < 0 : k === 'hedefAlti' ? !!x.simdi && x.simdi.kar >= 0 && x.simdi.marj < v.hedef_marj - 0.5
    : k === 'stokFark' ? x.stokFark !== null && x.stokFark !== 0 : k === 'eslesmeyen' ? !x.u : x.t.satista === false;
  const say = (k: IlanFiltre) => satirlar.filter((x) => uygun(x, k)).length;
  const liste = satirlar.filter((x) => uygun(x, f) && ara(q, x.t.baslik, x.t.barkod, x.t.stok_kodu, x.t.marka)).sort((a, b) => (a.simdi?.marj ?? 999) - (b.simdi?.marj ?? 999));
  const fBtn = (k: IlanFiltre, ad: string) => <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1.5 text-sm ${f === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{ad} <span className="opacity-60">{say(k)}</span></button>;
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Trendyol ilanı" deger={sayi(satirlar.length)} alt={`${sayi(satirlar.filter((x) => x.u).length)} tanesi bizdeki ürünle eşleşti`} />
        <Kpi etiket="Zararına satılan" deger={sayi(say('zarar'))} alt="Şu anki Trendyol fiyatıyla" renk="red" />
        <Kpi etiket={`Hedef marj (%${v.hedef_marj}) altında`} deger={sayi(say('hedefAlti'))} renk="amber" />
        <Kpi etiket="Stok farkı" deger={sayi(say('stokFark'))} alt="Trendyol stoğu ≠ iki deponun toplamı" renk="blue" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {fBtn('hepsi', 'Tümü')}{fBtn('zarar', 'Zararına')}{fBtn('hedefAlti', 'Hedef altı')}{fBtn('stokFark', 'Stok farkı')}{fBtn('eslesmeyen', 'Bizde eşleşmeyen')}{fBtn('kapali', 'Satışta değil')}
        <input className="inp ml-auto max-w-xs" placeholder="Ürün, barkod, stok kodu…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-ghost" disabled={!liste.length} onClick={() => csvIndir(`trendyol-ilan-${gunu()}.csv`, [['Barkod', 'Stok kodu', 'Ürün', 'Trendyol fiyatı', 'Önerilen fiyat', 'Şu anki kâr', 'Marj %', 'Komisyon %', 'Trendyol stok', 'Bizim stok'], ...liste.map((x) => [x.t.barkod, x.t.stok_kodu, x.t.baslik, x.t.satis_fiyati, x.hedef?.toFixed(2), x.simdi?.kar.toFixed(2), x.simdi?.marj.toFixed(1), x.k, x.t.stok, x.u?.stok])])}><Download size={16} /> CSV</button>
      </div>
      <div className="card">
        {liste.length === 0 ? <Bos metin="Bu filtrede ilan yok." /> : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>İlan</th><th className="text-right">Stok (TY / bizde)</th><th className="text-right">Alış</th><th className="text-right">Trendyol fiyatı</th><th className="text-right">Şu anki kâr</th><th className="text-right">Hedef fiyat</th></tr></thead>
              <tbody>{liste.slice(0, 600).map((x) => (
                <tr key={x.t.barkod}>
                  <td><div className="font-medium">{x.u ? <UrunLink id={x.u.id}>{x.t.baslik}</UrunLink> : x.t.baslik}</div>
                    <div className="text-xs text-slate-500">{[x.t.barkod, x.t.marka].filter(Boolean).join(' · ')} · komisyon %{x.k}{x.gercekKom ? '' : ' (varsayılan)'}
                      {!x.u && <span className="ml-1 rozet bg-amber-50 text-amber-800">bizde eşleşmedi</span>}{x.t.satista === false && <span className="ml-1 rozet bg-slate-100 text-slate-600">satışta değil</span>}</div></td>
                  <td className="text-right">{sayi(x.t.stok ?? 0)} / {x.u ? <span className={x.stokFark ? 'font-semibold text-sky-700' : ''}>{sayi(Math.max(0, x.u.stok))}</span> : '—'}</td>
                  <td className="text-right text-slate-500">{x.a > 0 ? para(x.a) : '—'}</td>
                  <td className="text-right font-medium">{x.t.satis_fiyati ? para(x.t.satis_fiyati) : '—'}</td>
                  <td className={`text-right font-semibold ${!x.simdi ? 'text-slate-300' : x.simdi.kar < 0 ? 'text-red-600' : x.simdi.marj < v.hedef_marj - 0.5 ? 'text-amber-600' : 'text-emerald-700'}`}>{x.simdi ? <>{para(x.simdi.kar)}<div className="text-[11px] font-normal">%{x.simdi.marj.toFixed(0)}</div></> : '—'}</td>
                  <td className="text-right font-semibold">{x.hedef ? <>{para(x.hedef)}{x.t.satis_fiyati ? <div className={`text-[11px] font-normal ${x.hedef > x.t.satis_fiyati ? 'text-red-600' : 'text-slate-400'}`}>{x.hedef > x.t.satis_fiyati ? '+' : ''}{para(x.hedef - x.t.satis_fiyati)}</div> : null}</> : '—'}</td>
                </tr>))}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Hedef fiyat = alış + komisyon + kargo + hizmet bedeli + stopaj + hedef kâr (%{v.hedef_marj}). Komisyon, o ürünün geçmiş Trendyol siparişlerinden alınır; siparişi yoksa varsayılan %{v.komisyon} kullanılır. Bizim stok = iki deponun toplamı. Fiyat ve stok Trendyol'a şimdilik BizimHesap E-Ticaret modülünden gidiyor; buradaki öneriler bilgi amaçlıdır.</p>
    </div>
  );
}

/* ───────── Öneriler ───────── */
function Oneriler({ veri, v }: { veri: TyVeri; v: TyVarsayim }) {
  const { db } = useStore();
  const [q, setQ] = useState(''); const [sadeceDuzenli, setSadeceDuzenli] = useState(true); const [barkodlu, setBarkodlu] = useState(true);
  const tum = useMemo(() => tyOneriler(db, veri.urunler, v), [db, veri.urunler, v.komisyon, v.kargo, v.hizmet, v.stopaj, v.hedef_marj]); // eslint-disable-line react-hooks/exhaustive-deps
  const liste = tum.filter((x) => (!sadeceDuzenli || x.belge >= 3) && (!barkodlu || x.barkodVar) && ara(q, x.u.ad, x.u.kod, x.u.marka, x.u.kategori));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="inp max-w-xs" placeholder="Ürün, marka, kategori…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sadeceDuzenli} onChange={(e) => setSadeceDuzenli(e.target.checked)} /> Dükkânda düzenli satılanlar (6 ayda 3+ fatura)</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={barkodlu} onChange={(e) => setBarkodlu(e.target.checked)} /> Barkodu olanlar</label>
        <span className="text-xs text-slate-500">{liste.length} ürün</span>
        <button className="btn-ghost ml-auto" disabled={!liste.length} onClick={() => csvIndir(`trendyol-oneri-${gunu()}.csv`, [['Stok kodu', 'Barkod', 'Ürün', 'Marka', 'Kategori', 'Stok', 'Alış (KDV hariç)', 'Dükkân fiyatı', 'Trendyol hedef fiyatı', 'Birim kâr', '6 ay satış'], ...liste.map((x) => [x.u.kod, x.u.barkod, x.u.ad, x.u.marka, x.u.kategori, x.u.stok, x.alis.toFixed(2), x.u.satis_fiyati, x.hedef.toFixed(2), x.kar.toFixed(2), x.satis6])])}><Download size={16} /> CSV</button>
      </div>
      <div className="card">
        {liste.length === 0 ? <Bos metin="Bu filtrede öneri yok." /> : (
          <div className="max-h-[62vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Ürün</th><th className="text-right">Stok</th><th className="text-right">6 ay satış</th><th className="text-right">Dükkân fiyatı</th><th className="text-right">Trendyol hedef fiyatı</th><th className="text-right">Birim kâr</th></tr></thead>
              <tbody>{liste.slice(0, 400).map((x) => (
                <tr key={x.u.id}>
                  <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka, x.u.kategori].filter(Boolean).join(' · ')}{!x.barkodVar && <span className="ml-1 rozet bg-amber-50 text-amber-800">barkod yok</span>}</div></td>
                  <td className="text-right">{sayi(x.u.stok)}</td>
                  <td className="text-right">{sayi(x.satis6)} <span className="text-[11px] text-slate-400">({x.belge} fatura)</span></td>
                  <td className="text-right text-slate-500">{para(x.u.satis_fiyati)}</td>
                  <td className="text-right font-semibold">{para(x.hedef)}{x.fark !== null && <div className={`text-[11px] font-normal ${x.fark > 40 ? 'text-red-600' : 'text-slate-400'}`}>dükkândan %{x.fark.toFixed(0)} {x.fark >= 0 ? 'yukarıda' : 'aşağıda'}</div>}</td>
                  <td className="text-right text-emerald-700">{para(x.kar)}</td>
                </tr>))}</tbody>
            </table>
          </div>)}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Stokta olup Trendyol'da ilanı bulunmayan, alış fiyatı bilinen ürünler. Hedef fiyat, varsayılan komisyon (%{v.komisyon}) ve kargo ({para(v.kargo)}) ile hesaplanır; Trendyol kategori komisyonu farklıysa fiyat değişir. Dükkân fiyatından çok yukarıda kalan ürünlerde Trendyol'da rekabet zor olabilir (kırmızı). Trendyol barkodsuz ürün kabul etmez.</p>
    </div>
  );
}

/* ───────── Varsayımlar ───────── */
function Varsayimlar({ v }: { v: TyVarsayim }) {
  const { calistir } = useStore();
  const [d, setD] = useState<Record<keyof TyVarsayim, string>>(() => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])) as Record<keyof TyVarsayim, string>);
  const alan = (k: keyof TyVarsayim, ad: string, birim: string, aciklama: string) => (
    <label className="block"><div className="text-sm font-medium">{ad}</div>
      <div className="mt-1 flex items-center gap-2"><input className="inp w-28 text-right" inputMode="decimal" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /><span className="text-sm text-slate-500">{birim}</span></div>
      <div className="mt-0.5 text-xs text-slate-500">{aciklama}</div></label>);
  const { db } = useStore();
  const kaydet = () => calistir(() => backend.ayarKaydet({ trendyol: { ...(db.ayarlar.trendyol ?? {}), komisyon: parse(d.komisyon), kargo: parse(d.kargo), hizmet: parse(d.hizmet), stopaj: parse(d.stopaj), hedef_marj: parse(d.hedef_marj) } }), 'Trendyol hesap varsayımları kaydedildi');
  return (
    <div className="card max-w-2xl p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {alan('hedef_marj', 'Hedef kâr marjı', '%', 'Satışın (KDV hariç) yüzde kaçı kâr kalsın')}
        {alan('komisyon', 'Varsayılan komisyon', '%', 'Ürünün Trendyol siparişi yoksa kullanılır; varsa gerçek oran alınır')}
        {alan('kargo', 'Sipariş başı kargo', 'TL (KDV dahil)', 'Anlaşmalı kargo ücretiniz (desi ortalaması)')}
        {alan('hizmet', 'Sipariş başı hizmet bedeli', 'TL (KDV dahil)', 'Trendyol platform hizmet bedeli vb. sabit kesinti')}
        {alan('stopaj', 'Stopaj', '%', 'E-ticaret stopajı (satış tutarı üzerinden)')}
      </div>
      <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={kaydet}>Kaydet</button></div>
      <p className="mt-3 text-xs text-slate-500">Bu değerler yalnız bu sitedeki kâr ve fiyat hesaplarında kullanılır. Kendi hakediş raporunuzdaki rakamlarla güncelleyin.</p>
    </div>
  );
}

/* ───────── Stok gönderimi ───────── */
function StokGonderimi({ veri, yenile }: { veri: TyVeri; yenile: () => Promise<void> }) {
  const { db, calistir } = useStore();
  const ayar = db.ayarlar.trendyol ?? null;
  const acik = ayar?.stok_gonder === true;
  const [guvenlik, setGuvenlik] = useState(String(ayar?.guvenlik ?? 0));
  const [gecmis, setGecmis] = useState<TyGonderim[] | null>(null);
  const [onay, setOnay] = useState(false);
  const gOku = () => backend.tyGonderimOku().then(setGecmis, () => setGecmis([]));
  useEffect(() => { gOku(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const g = Math.max(0, parse(guvenlik) || 0);
  const urun = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  const degisecek = veri.urunler.flatMap((t) => { const u = t.urun_id ? urun.get(t.urun_id) : undefined; if (!u) return []; const yeni = Math.min(20000, Math.max(0, Math.floor(u.aktif ? u.stok : 0) - g)); return yeni === (t.stok ?? -1) ? [] : [{ t, u, yeni }]; });
  const ayarYaz = (p: { stok_gonder?: boolean; guvenlik?: number }, mesaj: string) => calistir(() => backend.ayarKaydet({ trendyol: { ...TY_VARSAYILAN, ...(ayar ?? {}), ...p } }), mesaj);
  const gonder = () => calistir(async () => { const r = await backend.tyCalistir('stok_gonder'); if (r.ok === false) throw new Error(String(r.hata)); toast(`${sayi(Number(r.stokGonderilen) || 0)} ilanın stoğu Trendyol'a gönderildi`); await yenile(); await gOku(); });
  return (
    <div className="space-y-4">
      <div className={`card p-4 ${acik ? 'border-emerald-300 dark:border-emerald-700' : ''}`}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">Otomatik stok gönderimi: {acik ? <span className="text-emerald-700">AÇIK</span> : <span className="text-slate-500">KAPALI</span>}</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Açıkken her 15 dakikada eşleşen Trendyol ilanlarının stoğu <b>iki deponun toplamı − güvenlik stoğu</b> olarak Trendyol'a yazılır. Stoğu biten ürün Trendyol'da 0'a iner. Yalnız stok adedi gönderilir; fiyat ve ürün bilgisi değişmez.</p>
          </div>
          {acik ? <button className="btn-ghost text-red-600" onClick={() => ayarYaz({ stok_gonder: false }, 'Otomatik stok gönderimi kapatıldı')}>Kapat</button>
            : <button className="btn-primary" disabled={!onay} onClick={() => ayarYaz({ stok_gonder: true, guvenlik: g }, 'Otomatik stok gönderimi açıldı')}>Aç</button>}
        </div>
        {!acik && <label className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <input type="checkbox" className="mt-1" checked={onay} onChange={(e) => setOnay(e.target.checked)} />
          <span><b>BizimHesap'ın Trendyol'a stok göndermesini kapattım.</b> (BizimHesap → E-Ticaret → Trendyol ayarlarında stok gönderimi / stok eşitleme.) İki sistem aynı anda gönderirse stoklar birbirini ezer. Sipariş aktarımı açık kalabilir.</span></label>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>Güvenlik stoğu:</span><input className="inp w-20 py-1 text-right" inputMode="numeric" value={guvenlik} onChange={(e) => setGuvenlik(e.target.value)} />
          <span className="text-slate-500">adet (dükkânda satılıp henüz düşmemiş olabilecek mal için; 1 yazarsanız son ürün Trendyol'da görünmez)</span>
          {g !== (ayar?.guvenlik ?? 0) && <button className="btn-ghost py-1 text-xs" onClick={() => ayarYaz({ guvenlik: g }, 'Güvenlik stoğu kaydedildi')}>Kaydet</button>}
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <b>Gönderilecek değişiklikler</b><span className="text-xs text-slate-500">{degisecek.length} ilan · son okumaya göre</span>
          <button className="btn-primary ml-auto py-1" disabled={!degisecek.length} onClick={gonder} title="Şimdi bir kez gönderir (otomatik kapalı olsa da)">Şimdi gönder</button>
        </div>
        {degisecek.length === 0 ? <Bos metin="Trendyol stokları iki deponun toplamıyla aynı 👍" /> : (
          <table className="tbl">
            <thead><tr><th>İlan</th><th className="text-right">Trendyol'da</th><th className="text-right">Bizde (2 depo)</th><th className="text-right">Gönderilecek</th></tr></thead>
            <tbody>{degisecek.map(({ t, u, yeni }) => (
              <tr key={t.barkod}><td><div className="font-medium"><UrunLink id={u.id}>{t.baslik}</UrunLink></div><div className="text-xs text-slate-500">{t.barkod}</div></td>
                <td className="text-right">{sayi(t.stok ?? 0)}</td><td className="text-right">{sayi(Math.max(0, u.stok))}</td>
                <td className={`text-right text-base font-bold ${yeni === 0 ? 'text-red-600' : 'text-sky-700'}`}>{sayi(yeni)}</td></tr>))}</tbody>
          </table>)}
      </div>

      <div className="card">
        <div className="border-b border-slate-200 p-3 dark:border-slate-800"><b>Gönderim geçmişi</b> <span className="text-xs text-slate-500">son 100</span></div>
        {!gecmis ? <div className="p-4 text-sm text-slate-500">Yükleniyor…</div> : gecmis.length === 0 ? <Bos metin="Henüz gönderim yok." /> : (
          <div className="max-h-[40vh] overflow-auto">
            <table className="tbl">
              <thead><tr><th>Zaman</th><th>İlan</th><th className="text-right">Eski → yeni</th><th>Durum</th></tr></thead>
              <tbody>{gecmis.map((x) => <tr key={x.id}><td className="whitespace-nowrap text-xs">{tarihSaat(x.zaman)}<div className="text-[10px] text-slate-400">{x.kaynak}</div></td><td className="text-sm">{x.baslik ?? x.barkod}</td><td className="text-right">{x.eski ?? '—'} → <b>{x.yeni}</b></td>
                <td><span className={`rozet ${x.durum === 'basarili' ? 'bg-emerald-50 text-emerald-700' : x.durum === 'hatali' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`} title={x.hata ?? undefined}>{x.durum === 'basarili' ? 'Trendyol onayladı' : x.durum === 'hatali' ? 'hata' : 'gönderildi'}</span></td></tr>)}</tbody>
            </table>
          </div>)}
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Yalnız bizdeki bir ürünle (barkod veya stok kodu) eşleşen ilanların stoğu gönderilir. BizimHesap'ta pasif olan ürünün stoğu 0 gönderilir. Trendyol isteği birkaç dakika içinde işler; sonucu "Durum" sütununda görürsünüz.</p>
    </div>
  );
}
