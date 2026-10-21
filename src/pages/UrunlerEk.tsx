import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ClipboardList, Copy, Download, Info, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type SayimSatir } from '../lib/backend';
import { depoSiparisleri } from '../lib/analiz3';
import { fiyatSatirlari } from '../lib/fiyatUyari';
import { stokluMu } from '../lib/analiz';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { ara, gunu, para, parse, sayi, tarih, tarihSaat } from '../lib/format';
import type { Urun } from '../lib/types';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik, onayla } from '../components/ui';
import { yazdir } from '../components/Yazdir';

const kisa = (s: string) => s.replace(/ DEPO(SU)?$/i, '');
const csvIndir = (ad: string, satirlar: (string | number | null | undefined)[][]) => {
  const icerik = satirlar.map((a) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = ad; el.click();
};
const kopyala = (m: string) => navigator.clipboard?.writeText(m).then(() => toast('Kopyalandı — WhatsApp\'a yapıştırabilirsiniz'), () => toast('Kopyalanamadı', 'hata'));

/* ───────────────────────── Depolar arası transfer ───────────────────────── */

interface Transfer { u: Urun; kaynak: string; hedef: string; adet: number; kaynakStok: number; hedefStok: number; hedefSatis: number; neden: 'bitti' | 'azaliyor' }

export function TransferOnerisi() {
  const { db } = useStore();
  const [gunSec, setGunSec] = useState(60);
  const [q, setQ] = useState('');
  const hedefGun = db.ayarlar.hedef_gun || 30;
  const yon = useMemo(() => {
    const dps = depoSiparisleri(db, gunSec, hedefGun, true);
    // bir deponun fazlası birden çok depoya dağıtılırken iki kez sayılmasın
    const kalan = new Map<string, number>();
    const liste: Transfer[] = [];
    for (const dp of dps) for (const x of dp.satirlar) {
      if (x.transfer <= 0) continue;
      let ihtiyac = x.transfer;
      for (const o of [...x.digerStok].sort((a, b) => b.fazla - a.fazla)) {
        if (ihtiyac <= 0) break;
        const k = `${o.ad}|${x.u.id}`; const f = kalan.has(k) ? kalan.get(k)! : o.fazla; if (f <= 0) continue;
        const adet = Math.min(ihtiyac, f); kalan.set(k, f - adet); ihtiyac -= adet;
        liste.push({ u: x.u, kaynak: o.ad, hedef: dp.ad, adet, kaynakStok: o.stok, hedefStok: x.stok, hedefSatis: x.satilan, neden: x.neden });
      }
    }
    const m = new Map<string, Transfer[]>();
    for (const t of liste) { const k = `${t.kaynak} → ${t.hedef}`; m.set(k, [...(m.get(k) ?? []), t]); }
    return [...m.entries()].map(([ad, l]) => ({ ad, kaynak: l[0].kaynak, hedef: l[0].hedef, l: l.sort((a, b) => (a.u.raf ?? '').localeCompare(b.u.raf ?? '', 'tr') || a.u.ad.localeCompare(b.u.ad, 'tr')) }));
  }, [db, gunSec, hedefGun]);
  const [secili, setSecili] = useState<string | null>(null);
  const g = yon.find((x) => x.ad === secili) ?? yon[0];
  const liste = g ? g.l.filter((t) => ara(q, t.u.ad, t.u.kod, t.u.marka, t.u.raf)) : [];
  const metin = () => g ? [`${db.ayarlar.firma_adi} — depo transferi (${tarih(new Date().toISOString())})`, `${kisa(g.kaynak)} ➜ ${kisa(g.hedef)}`, '',
    ...liste.map((t) => `• ${t.u.ad}${t.u.kod ? ` [${t.u.kod}]` : ''}${t.u.raf ? ` (raf ${t.u.raf})` : ''} — ${sayi(t.adet)} ${t.u.birim}`), '', `Toplam ${liste.length} kalem, ${sayi(liste.reduce((s, t) => s + t.adet, 0))} adet`].join('\n') : '';
  const bas = () => g && yazdir(
    <div className="p-4 text-[11px]">
      <div className="mb-2 flex justify-between"><b className="text-sm">DEPO TRANSFER FİŞİ — {kisa(g.kaynak)} ➜ {kisa(g.hedef)}</b><span>{db.ayarlar.firma_adi} · {tarih(new Date().toISOString())}</span></div>
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-black text-left"><th className="py-1">Raf</th><th>Kod</th><th>Ürün</th><th className="text-right">Adet</th><th className="w-20 text-right">Gönderildi</th><th className="w-20 text-right">Teslim alındı</th></tr></thead>
        <tbody>{liste.map((t) => <tr key={t.u.id} className="border-b border-slate-300"><td className="py-1">{t.u.raf}</td><td className="font-mono">{t.u.kod}</td><td>{t.u.ad}{t.u.marka ? ` (${t.u.marka})` : ''}</td><td className="text-right font-bold">{sayi(t.adet)} {t.u.birim}</td><td /><td /></tr>)}</tbody>
      </table>
      <div className="mt-6 flex justify-between"><span>Gönderen: ____________________</span><span>Teslim alan: ____________________</span></div>
    </div>);

  return (
    <div>
      <SayfaBaslik baslik="Depolar Arası Transfer" alt={`Bir depoda biten/azalan, diğer depoda ${hedefGun} günlük ihtiyacından fazlası olan ürünler · sipariş vermeden önce`}>
        <select className="inp w-36" value={gunSec} onChange={(e) => setGunSec(Number(e.target.value))}>{[30, 60, 90, 180].map((n) => <option key={n} value={n}>Son {n} gün satış</option>)}</select>
      </SayfaBaslik>
      {!g ? <div className="card"><Bos metin="Şu an transfer önerisi yok: hiçbir depoda, diğer deponun fazlasıyla karşılanabilecek eksik görünmüyor." /></div> : <>
        <div className="mb-3 flex flex-wrap gap-2">
          {yon.map((y) => (
            <button key={y.ad} onClick={() => setSecili(y.ad)} className={`card flex items-center gap-2 px-4 py-2.5 text-left ${y.ad === g.ad ? 'ring-2 ring-sky-500' : ''}`}>
              <b>{kisa(y.kaynak)}</b><ArrowRight size={16} className="text-sky-600" /><b>{kisa(y.hedef)}</b>
              <span className="rozet bg-sky-50 text-sky-700">{y.l.length} kalem · {sayi(y.l.reduce((s, t) => s + t.adet, 0))} adet</span>
            </button>))}
        </div>
        <div className="card">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <input className="inp max-w-xs" placeholder="Ürün, kod, raf…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="text-xs text-slate-500">{liste.length} kalem</span>
            <div className="ml-auto flex gap-2">
              <button className="btn-ghost" onClick={() => kopyala(metin())}><Copy size={16} /> Metni kopyala</button>
              <button className="btn-ghost" onClick={bas}><Printer size={16} /> Transfer fişi</button>
              <button className="btn-ghost" onClick={() => csvIndir(`transfer-${gunu()}.csv`, [['Gönderen', 'Alan', 'Raf', 'Kod', 'Ürün', 'Marka', 'Gönderen stok', 'Alan stok', `Alan ${gunSec} gün satış`, 'Transfer adedi'], ...liste.map((t) => [t.kaynak, t.hedef, t.u.raf, t.u.kod, t.u.ad, t.u.marka, t.kaynakStok, t.hedefStok, t.hedefSatis, t.adet])])}><Download size={16} /> CSV</button>
            </div>
          </div>
          {/* telefon */}
          <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
            {liste.map((t) => (
              <div key={t.u.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1"><div className="truncate font-medium"><UrunLink id={t.u.id}>{t.u.ad}</UrunLink></div>
                  <div className="text-xs text-slate-500">{[t.u.kod, t.u.raf && `raf ${t.u.raf}`].filter(Boolean).join(' · ')}</div>
                  <div className="text-xs text-slate-500">{kisa(t.kaynak)}: {sayi(t.kaynakStok)} · {kisa(t.hedef)}: <span className={t.hedefStok <= 0 ? 'text-red-600' : ''}>{sayi(t.hedefStok)}</span> · {gunSec}g satış {sayi(t.hedefSatis)}</div></div>
                <div className="text-right text-lg font-bold text-sky-700">{sayi(t.adet)}<div className="text-[10px] font-normal text-slate-400">{t.u.birim}</div></div>
              </div>))}
          </div>
          <div className="hidden max-h-[62vh] overflow-auto md:block">
            <table className="tbl">
              <thead><tr><th>Ürün</th><th>Raf</th><th className="text-right">{kisa(g.kaynak)} stok</th><th className="text-right">{kisa(g.hedef)} stok</th><th className="text-right">{kisa(g.hedef)} {gunSec} gün satış</th><th className="text-right">Gönderilecek</th></tr></thead>
              <tbody>{liste.map((t) => (
                <tr key={t.u.id}>
                  <td><div className="font-medium"><UrunLink id={t.u.id}>{t.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[t.u.kod, t.u.marka].filter(Boolean).join(' · ')}</div></td>
                  <td>{t.u.raf}</td><td className="text-right">{sayi(t.kaynakStok)}</td>
                  <td className="text-right"><span className={`rozet ${t.hedefStok <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{sayi(t.hedefStok)}</span></td>
                  <td className="text-right">{sayi(t.hedefSatis)}</td><td className="text-right text-base font-bold text-sky-700">{sayi(t.adet)} <span className="text-xs font-normal text-slate-400">{t.u.birim}</span></td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Gönderen depoda kendi {hedefGun} günlük ihtiyacı bırakılır; yalnız fazlası önerilir. Transferi BizimHesap'ta depo transfer fişiyle yapın — bu sayfa BizimHesap'a bir şey yazmaz.</p>
      </>}
    </div>
  );
}

/* ───────────────────────── Fiyat uyarıları ───────────────────────── */

type Uyari = 'guncellenmedi' | 'zarar' | 'hedefAlti';

export function FiyatUyarilari() {
  const { db } = useStore();
  const h = db.ayarlar.hedef_marj ?? 15;
  const satirlar = useMemo(() => fiyatSatirlari(db, h), [db, h]);
  const [tur, setTur] = useState<Uyari>('guncellenmedi');
  const [q, setQ] = useState('');
  const [sadeceStok, setSadeceStok] = useState(true);
  const uyar = (r: (typeof satirlar)[number], t: Uyari) => t === 'guncellenmedi' ? r.fiyatGuncellenmedi : t === 'zarar' ? r.marjGuncel !== null && r.marjGuncel < 0 : r.marjGuncel !== null && r.marjGuncel >= 0 && r.marjGuncel < h - 0.5;
  const temel = satirlar.filter((r) => !sadeceStok || r.u.stok > 0);
  const say = (t: Uyari) => temel.filter((r) => uyar(r, t)).length;
  const liste = temel.filter((r) => uyar(r, tur) && ara(q, r.u.ad, r.u.kod, r.u.marka, r.u.kategori))
    .sort((a, b) => tur === 'guncellenmedi' ? (b.son!.fiyat / Math.max(0.01, b.bk.alisNet)) - (a.son!.fiyat / Math.max(0.01, a.bk.alisNet)) : (a.marjGuncel ?? 0) - (b.marjGuncel ?? 0));
  const kart = (t: Uyari, ad: string, alt: string, renk: 'red' | 'amber') => (
    <button className={`text-left ${tur === t ? 'rounded-xl ring-2 ring-sky-500' : ''}`} onClick={() => setTur(t)}><Kpi etiket={ad} deger={sayi(say(t))} alt={alt} renk={renk} /></button>);

  return (
    <div>
      <SayfaBaslik baslik="Fiyat Uyarıları" alt="Alış fiyatı değişip satış fiyatı güncellenmeyen ürünler · stoktakiler">
        <button className="btn-ghost" onClick={() => csvIndir(`fiyat-uyarilari-${gunu()}.csv`, [['Uyarı', 'Kod', 'Ürün', 'Marka', 'Stok', 'BH alış (net)', 'Son fatura alışı', 'Fatura tarihi', 'Tedarikçi', 'Satış (KDV dahil)', 'Güncel marj %', `Önerilen (%${h})`],
          ...liste.map((r) => [tur, r.u.kod, r.u.ad, r.u.marka, r.u.stok, r.bk.alisNet.toFixed(2), r.son?.fiyat.toFixed(2), r.son?.tarih, r.son?.tedarikci, r.u.satis_fiyati, r.marjGuncel?.toFixed(1), r.oneri])])}><Download size={16} /> CSV</button>
      </SayfaBaslik>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {kart('guncellenmedi', 'Maliyet arttı, fiyat aynı', 'Son faturadaki alış BH alışından %2+ yüksek ve satış fiyatı o tarihten beri değişmedi', 'red')}
        {kart('zarar', 'Zararına fiyatlı', 'Satış (KDV hariç) güncel maliyetin altında', 'red')}
        {kart('hedefAlti', `Hedef marj (%${h}) altında`, 'Zararda değil ama hedefin altında', 'amber')}
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sadeceStok} onChange={(e) => setSadeceStok(e.target.checked)} /> Sadece stoktakiler</label>
          <span className="text-xs text-slate-500">{liste.length} ürün</span>
          <a href="#fiyat" className="ml-auto text-xs text-sky-700 hover:underline">Fiyat & Marj sayfası →</a>
          <a href="#kayip" className="text-xs text-sky-700 hover:underline">Alışın altında satılanlar (Kayıp-Kaçak) →</a>
        </div>
        {liste.length === 0 ? <Bos metin="Bu uyarıda ürün yok." /> : <>
          <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
            {liste.slice(0, 300).map((r) => (
              <div key={r.u.id} className="p-3">
                <div className="font-medium"><UrunLink id={r.u.id}>{r.u.ad}</UrunLink></div>
                <div className="text-xs text-slate-500">{[r.u.kod, r.u.marka, `stok ${sayi(r.u.stok)}`].filter(Boolean).join(' · ')}</div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-slate-400">Son alış</div><b className={r.maliyetArtti ? 'text-red-600' : ''}>{r.son ? para(r.son.fiyat) : '—'}</b></div>
                  <div><div className="text-slate-400">Satış · marj</div><b>{para(r.u.satis_fiyati)}</b> <span className={r.marjGuncel !== null && r.marjGuncel < 0 ? 'text-red-600' : 'text-amber-600'}>{r.marjGuncel === null ? '' : `%${r.marjGuncel.toFixed(0)}`}</span></div>
                  <div><div className="text-slate-400">Önerilen</div><b className="text-emerald-700">{r.oneri ? para(r.oneri) : '—'}</b></div>
                </div>
              </div>))}
          </div>
          <div className="hidden max-h-[62vh] overflow-auto md:block">
            <table className="tbl">
              <thead><tr><th>Ürün</th><th className="text-right">Stok</th><th className="text-right">BH alış</th><th className="text-right">Son fatura alışı</th><th className="text-right">Satış</th><th className="text-right">Güncel marj</th><th className="text-right">Önerilen satış</th><th className="text-right">Fark</th></tr></thead>
              <tbody>{liste.slice(0, 500).map((r) => (
                <tr key={r.u.id}>
                  <td><div className="font-medium"><UrunLink id={r.u.id}>{r.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[r.u.kod, r.u.marka].filter(Boolean).join(' · ')}</div></td>
                  <td className="text-right">{sayi(r.u.stok)}</td>
                  <td className="text-right text-slate-500">{r.u.alis_fiyati > 0 ? para(r.bk.alisNet) : '—'}</td>
                  <td className={`text-right ${r.maliyetArtti ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{r.son ? <>{para(r.son.fiyat)}{r.maliyetArtti && r.bk.alisNet > 0 && <span className="ml-1 text-[10px]">+%{((r.son.fiyat / r.bk.alisNet - 1) * 100).toFixed(0)}</span>}<div className="text-[10px] font-normal text-slate-400">{tarih(r.son.tarih + 'T12:00')}{r.son.tedarikci ? ` · ${r.son.tedarikci}` : ''}</div></> : '—'}</td>
                  <td className="text-right font-medium">{para(r.u.satis_fiyati)}</td>
                  <td className={`text-right ${r.marjGuncel === null ? 'text-slate-300' : r.marjGuncel < 0 ? 'text-red-600' : r.marjGuncel < h - 0.5 ? 'text-amber-600' : 'text-emerald-700'}`}>{r.marjGuncel === null ? '—' : `%${r.marjGuncel.toFixed(0)}`}</td>
                  <td className="text-right font-semibold text-emerald-700">{r.oneri ? para(r.oneri) : '—'}</td>
                  <td className="text-right text-xs">{r.oneri ? `${r.oneri > r.u.satis_fiyati ? '+' : ''}${para(r.oneri - r.u.satis_fiyati)}` : ''}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </>}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Güncel maliyet = BizimHesap alışı ile son faturadaki net alışın büyüğü. Hedef marj Ayarlar / Fiyat & Marj'dan değişir. Fiyatları BizimHesap'ta siz güncellersiniz; bu sayfa yalnız okur.</p>
    </div>
  );
}

/* ───────────────────────── Stok sayımı ───────────────────────── */

export function StokSayimi() {
  const { db, izin, personel, eposta } = useStore(); const maliyetGor = izin('maliyet');
  const depolar = aktifDepolar(db);
  const harita = useMemo(() => stokHaritasi(db), [db]);
  const [depoId, setDepoId] = useState(depolar[0]?.id ?? '');
  const [sayim, setSayim] = useState<Map<string, SayimSatir>>(new Map());
  const [yukleniyor, setYukleniyor] = useState(false);
  const [q, setQ] = useState('');
  const [raf, setRaf] = useState('');
  const [kat, setKat] = useState('');
  const [gor, setGor] = useState<'hepsi' | 'sayilmadi' | 'fark' | 'sayildi'>('sayilmadi');
  const [sifirDahil, setSifirDahil] = useState(false);
  const [giris, setGiris] = useState<Record<string, string>>({});
  const [gosterilen, setGosterilen] = useState(150);
  const araRef = useRef<HTMLInputElement>(null);
  const depo = depolar.find((d) => d.id === depoId);
  const kim = personel || eposta || null;

  const oku = async () => {
    if (!depoId) return; setYukleniyor(true);
    try { const r = await backend.sayimOku(depoId); setSayim(new Map(r.map((x) => [x.urun_id, x]))); }
    catch (e) { toast(`Sayım okunamadı: ${(e as Error).message}`, 'hata'); }
    finally { setYukleniyor(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setGiris({}); oku(); }, [depoId]);

  const sistem = (u: Urun) => harita.get(u.id)?.get(depoId) ?? 0;
  const urunler = useMemo(() => db.urunler.filter((u) => u.aktif && stokluMu(u) && (sifirDahil || sistem(u) !== 0 || sayim.has(u.id)))
    .sort((a, b) => (a.raf || '￿').localeCompare(b.raf || '￿', 'tr', { numeric: true }) || a.ad.localeCompare(b.ad, 'tr')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [db, depoId, harita, sifirDahil, sayim]);
  const raflar = useMemo(() => Array.from(new Set(urunler.map((u) => (u.raf ?? '').split(/[-\s/.]/)[0].toLocaleUpperCase('tr')).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })), [urunler]);
  const kategoriler = useMemo(() => Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort() as string[], [urunler]);
  const fark = (u: Urun) => { const s = sayim.get(u.id); return s ? s.sayilan - sistem(u) : null; };
  const kapsam = urunler.filter((u) => (!raf || (u.raf ?? '').toLocaleUpperCase('tr').startsWith(raf)) && (!kat || u.kategori === kat));
  const liste = kapsam.filter((u) => {
    if (q && !ara(q, u.ad, u.kod, u.barkod, u.marka, u.raf)) return false;
    const f = fark(u);
    return gor === 'hepsi' ? true : gor === 'sayilmadi' ? f === null : gor === 'sayildi' ? f !== null : f !== null && f !== 0;
  });
  const sayilan = kapsam.filter((u) => sayim.has(u.id)).length;
  const farkli = kapsam.filter((u) => { const f = fark(u); return f !== null && f !== 0; });
  const farkDeger = farkli.reduce((t, u) => t + (fark(u) ?? 0) * u.alis_fiyati, 0);

  const kaydet = async (u: Urun, deger: string) => {
    if (deger.trim() === '') return;
    const n = parse(deger); if (!Number.isFinite(n) || n < 0) { toast('Geçerli bir adet yazın', 'hata'); return; }
    const r: SayimSatir = { depo_id: depoId, urun_id: u.id, sayilan: n, sistem: sistem(u), kullanici: kim };
    setSayim((m) => new Map(m).set(u.id, { ...r, zaman: new Date().toISOString() }));
    setGiris((g) => { const y = { ...g }; delete y[u.id]; return y; });
    try { await backend.sayimKaydet(r); }
    catch (e) { toast(`Kaydedilemedi: ${(e as Error).message}`, 'hata'); oku(); }
  };
  const geriAl = async (u: Urun) => {
    setSayim((m) => { const y = new Map(m); y.delete(u.id); return y; });
    try { await backend.sayimSil(depoId, u.id); } catch (e) { toast(`Silinemedi: ${(e as Error).message}`, 'hata'); oku(); }
  };
  const sifirla = async () => {
    if (!depo || !onayla(`${depo.ad} için kayıtlı ${sayim.size} sayım satırı silinsin mi? (BizimHesap'taki stok değişmez)`)) return;
    try { await backend.sayimSil(depoId); setSayim(new Map()); toast('Sayım sıfırlandı'); } catch (e) { toast(`Silinemedi: ${(e as Error).message}`, 'hata'); }
  };
  const csv = () => csvIndir(`sayim-farklari-${kisa(depo?.ad ?? '').toLowerCase()}-${gunu()}.csv`, [
    ['Depo', 'Raf', 'Kod', 'Barkod', 'Ürün', 'Marka', 'Sistem stoğu', 'Sayılan', 'Fark', ...(maliyetGor ? ['Birim alış', 'Fark tutarı'] : []), 'Sayan', 'Zaman'],
    ...farkli.map((u) => { const s = sayim.get(u.id)!; const f = fark(u)!; return [depo?.ad, u.raf, u.kod, u.barkod, u.ad, u.marka, sistem(u), s.sayilan, f, ...(maliyetGor ? [u.alis_fiyati.toFixed(2), (f * u.alis_fiyati).toFixed(2)] : []), s.kullanici, s.zaman ? tarihSaat(s.zaman) : '']; })]);
  const sayimFisi = () => depo && yazdir(
    <div className="p-4 text-[11px]">
      <div className="mb-2 flex justify-between"><b className="text-sm">SAYIM FİŞİ — {depo.ad}{raf ? ` · Raf ${raf}` : ''}{kat ? ` · ${kat}` : ''}</b><span>{db.ayarlar.firma_adi} · {tarih(new Date().toISOString())}</span></div>
      <table className="w-full border-collapse">
        <thead><tr className="border-b border-black text-left"><th className="py-1">Raf</th><th>Kod</th><th>Ürün</th><th>Birim</th><th className="w-24 text-right">Sayılan</th></tr></thead>
        <tbody>{kapsam.map((u) => <tr key={u.id} className="border-b border-slate-300"><td className="py-1.5">{u.raf}</td><td className="font-mono">{u.kod}</td><td>{u.ad}{u.marka ? ` (${u.marka})` : ''}</td><td>{u.birim}</td><td className="border-l border-slate-300" /></tr>)}</tbody>
      </table>
      <div className="mt-6">Sayan: ____________________ &nbsp;&nbsp; Kontrol eden: ____________________</div>
    </div>);
  // barkod okutup Enter: tek sonuç varsa onun adet kutusuna geç
  const araEnter = () => { if (liste.length === 1) document.getElementById(`sayim-${liste[0].id}`)?.focus(); };
  const sonraki = (u: Urun) => { setTimeout(() => { if (q) { setQ(''); araRef.current?.focus(); return; } const i = liste.findIndex((x) => x.id === u.id); const n = liste[i + 1]; if (n) document.getElementById(`sayim-${n.id}`)?.focus(); }, 0); };

  // bileşen değil düz fonksiyon: her tuşta yeniden bağlanıp odağı kaybetmesin
  const satir = (u: Urun) => {
    const s = sayim.get(u.id); const f = fark(u); const st = sistem(u);
    return (
      <div key={u.id} className={`flex items-center gap-3 px-3 py-2.5 ${f !== null && f !== 0 ? 'bg-amber-50/60 dark:bg-amber-500/5' : f === 0 ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : ''}`}>
        <div className="w-14 shrink-0 text-xs font-semibold text-slate-500">{u.raf || '—'}</div>
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-snug"><UrunLink id={u.id}>{u.ad}</UrunLink></div>
          <div className="text-xs text-slate-500">{[u.kod, u.marka].filter(Boolean).join(' · ')} · sistem <b>{sayi(st)}</b> {u.birim}
            {s && <span className="ml-1 text-slate-400"> · {s.kullanici ?? ''} {s.zaman ? tarihSaat(s.zaman) : ''}{s.sistem !== null && s.sistem !== st ? ` · sayarken sistem ${sayi(s.sistem)} idi` : ''}</span>}</div>
        </div>
        {f !== null && <div className={`w-16 text-right text-sm font-bold ${f === 0 ? 'text-emerald-600' : f < 0 ? 'text-red-600' : 'text-sky-700'}`}>{f === 0 ? <Check size={18} className="ml-auto" /> : `${f > 0 ? '+' : ''}${sayi(f)}`}{maliyetGor && f !== 0 && u.alis_fiyati > 0 && <div className="text-[10px] font-normal">{para(f * u.alis_fiyati)}</div>}</div>}
        <input id={`sayim-${u.id}`} className="inp w-20 py-1.5 text-right text-base font-semibold" inputMode="decimal" placeholder={s ? sayi(s.sayilan) : 'adet'}
          value={giris[u.id] ?? ''} onChange={(e) => setGiris((g) => ({ ...g, [u.id]: e.target.value }))}
          onBlur={(e) => kaydet(u, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { kaydet(u, (e.target as HTMLInputElement).value); sonraki(u); } }} />
        {s ? <button title="Bu sayımı geri al" className="rounded p-1 text-slate-300 hover:text-red-600" onClick={() => geriAl(u)}><Trash2 size={15} /></button> : <span className="w-[23px]" />}
      </div>
    );
  };

  return (
    <div>
      <SayfaBaslik baslik="Stok Sayımı" alt="Rafı rafı sayın, sistemle farkı görün · sayım bu sitede saklanır, BizimHesap'a yazılmaz">
        <button className="btn-ghost" onClick={sayimFisi}><Printer size={16} /> Sayım fişi</button>
        <button className="btn-ghost" onClick={csv} disabled={!farkli.length}><Download size={16} /> Farklar (CSV)</button>
      </SayfaBaslik>
      {!depo ? <div className="card"><Bos metin="Depo yok." /></div> : <>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi etiket="Sayılan" deger={`${sayi(sayilan)} / ${sayi(kapsam.length)}`} alt={`%${kapsam.length ? Math.round((sayilan / kapsam.length) * 100) : 0} tamam`} renk="blue" ikon={<ClipboardList size={18} />} />
          <Kpi etiket="Farklı çıkan" deger={sayi(farkli.length)} alt={`${sayi(farkli.filter((u) => fark(u)! < 0).length)} eksik · ${sayi(farkli.filter((u) => fark(u)! > 0).length)} fazla`} renk={farkli.length ? 'amber' : 'green'} />
          {maliyetGor ? <Kpi etiket="Fark tutarı (alış)" deger={para(farkDeger)} alt="Eksi: eksik mal" renk={farkDeger < 0 ? 'red' : 'green'} /> : <Kpi etiket="Depo" deger={kisa(depo.ad)} />}
          <Kpi etiket="Sistemle aynı" deger={sayi(sayilan - farkli.length)} renk="green" />
        </div>
        <div className="card">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
            {depolar.length > 1 && <select className="inp w-40" value={depoId} onChange={(e) => setDepoId(e.target.value)}>{depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}</select>}
            <select className="inp w-28" value={raf} onChange={(e) => { setRaf(e.target.value); setGosterilen(150); }}><option value="">Tüm raflar</option>{raflar.map((r) => <option key={r} value={r}>Raf {r}</option>)}</select>
            <select className="inp w-36" value={kat} onChange={(e) => { setKat(e.target.value); setGosterilen(150); }}><option value="">Tüm kategoriler</option>{kategoriler.map((k) => <option key={k}>{k}</option>)}</select>
            <input ref={araRef} className="inp min-w-[12rem] flex-1 sm:max-w-xs" placeholder="Barkod okutun veya ad / kod yazın" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && araEnter()} />
            <div className="flex gap-1">{([['sayilmadi', 'Sayılmayan'], ['fark', 'Farklı'], ['sayildi', 'Sayılan'], ['hepsi', 'Tümü']] as const).map(([k, ad]) => (
              <button key={k} onClick={() => setGor(k)} className={`rounded-full px-3 py-1 text-xs ${gor === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{ad}</button>))}</div>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={sifirDahil} onChange={(e) => setSifirDahil(e.target.checked)} /> Stoğu 0 olanlar da</label>
            <div className="ml-auto flex gap-1">
              <button className="btn-ghost px-2 py-1 text-xs" onClick={oku} disabled={yukleniyor} title="Başka telefondan sayılanları da getir"><RefreshCw size={14} className={yukleniyor ? 'animate-spin' : ''} /> Yenile</button>
              {sayim.size > 0 && <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={sifirla}><Trash2 size={14} /> Sayımı sıfırla</button>}
            </div>
          </div>
          {liste.length === 0 ? <Bos metin={gor === 'sayilmadi' && kapsam.length ? 'Bu kapsamda sayılmayan ürün kalmadı.' : 'Ürün yok.'} /> : (
            <div className="max-h-[65vh] divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
              {liste.slice(0, gosterilen).map(satir)}
              {liste.length > gosterilen && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGosterilen((g) => g + 300)}>Daha fazla ({liste.length - gosterilen})</button></div>}
            </div>)}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Adedi yazıp Enter'a basın (kaydedilir, sonraki ürüne geçer). Birden çok kişi aynı anda farklı rafları sayabilir; "Yenile" diğerlerinin saydığını getirir. Farkları BizimHesap'ta stok düzeltme / sayım fişiyle işleyin, sonra "Sayımı sıfırla".</p>
      </>}
    </div>
  );
}
