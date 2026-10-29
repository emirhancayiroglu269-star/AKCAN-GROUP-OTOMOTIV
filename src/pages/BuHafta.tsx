import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Info, Loader2, MessageSquare, RefreshCw, Truck } from 'lucide-react';
import { useStore, toast } from '../lib/store';
import { backend, type OmAramaSonuc, type NekoToplu, type RakipUrun, type SorulanRafa } from '../lib/backend';
import { alinacakHesap, gecerliHareketler, kritikAltinda, stokluMu, takipGunu, urunOzetleri, type Donem } from '../lib/analiz';
import { PERAKENDE_RE } from '../lib/analiz2';
import { aracAnalizi } from '../lib/analiz3';
import { depoKisa, stoktakiMuadiller } from '../lib/muadil';
import { aktifDepolar, stokHaritasi } from '../lib/depo';
import { gunu, para, sayi, tarih } from '../lib/format';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { Durum, TedarikciArama, omDurum, tedKod } from './UrunAra';

/** Haftalık alım kararı: kendi satışımız + tezgâhta sorulanlar + pazarda (Otoparçasan) çok satılanlar → tek, sıralı liste */
type Kaynak = 'biten' | 'sorulan' | 'pazar';
interface Satir {
  anahtar: string; kaynak: Kaynak; kod: string; ad: string; marka: string | null; neden: string; adet: number;
  urunId: string | null; alis: number | null; pazarFiyat: number | null; pazarUrl: string | null; puan: number; araclar: string[]; etiket: string[];
}

const norm = (k: string | null | undefined) => (k ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const sade = (s: string) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ë/g, 'e').replace(/[^a-z]/g, '');
const aracAd = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const katAd = (s: string | null) => (s ?? '').split('-').map((w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1)).join(' ');
/** hızlı giden aşınma parçaları (pazar taramasında da önce bunlar taranır) */
const HIZLI_KAT = /(filtre|balata|fren-disk|disk-ayna|amortisor|rotil|rot-basi|rot-mil|z-rot|salincak|triger|kayis|gergi|termostat|devirdaim|su-pompa|buji|bobin|takoz|koruk|rulman|aks-kafa|debriyaj|viraj|sensor|ampul|silecek|antifriz)/;
const KAYNAK: Record<Kaynak, { ad: string; renk: string; aciklama: string }> = {
  biten: { ad: 'Bizde düzenli satılıyor, bitiyor', renk: 'bg-red-50 text-red-700', aciklama: 'Son 6 ayda düzenli satılan (en az 3 fatura, 2 müşteri) ve stoğu 2 haftadan az yetecek ürünler' },
  sorulan: { ad: 'Tezgâhta soruldu, bizde yok', renk: 'bg-amber-50 text-amber-700', aciklama: 'Son 90 günde en az 2 kez sorulup bizde olmayan parçalar' },
  pazar: { ad: 'Pazarda çok satılıyor, rafta yok', renk: 'bg-sky-50 text-sky-700', aciklama: 'Müşterilerimizin araç markalarında Otoparçasan\'da en üstte listelenen, bizde olmayan parçalar' },
};
const yerel = { al: (k: string, v: string) => { try { return localStorage.getItem(k) ?? v; } catch { return v; } }, yaz: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* yok */ } } };
async function kopyala(metin: string, mesaj: string) {
  try { await navigator.clipboard.writeText(metin); toast(mesaj); }
  catch { const t = document.createElement('textarea'); t.value = metin; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast(mesaj); }
}

export default function BuHafta() {
  const { db, izin } = useStore();
  const depolar = aktifDepolar(db); const harita = useMemo(() => stokHaritasi(db), [db]); const maliyetGor = izin('maliyet');
  const [pazar, setPazar] = useState<{ urunler: RakipUrun[]; sayfa: number; taranan: number } | null>(null);
  const [sorulan, setSorulan] = useState<SorulanRafa[]>([]);
  const [yuk, setYuk] = useState(false);
  const [pazarSay, setPazarSay] = useState(() => Number(yerel.al('buhafta_pazar', '40')) || 40);
  const [secMarka, setSecMarka] = useState<string[] | null>(null);
  const [kapali, setKapali] = useState<Set<Kaynak>>(new Set());
  const [omAcik, setOmAcik] = useState<string | null>(null);
  const [neko, setNeko] = useState<Map<string, NekoToplu>>(new Map());
  const [nekoYuk, setNekoYuk] = useState<string | null>(null);
  const [om, setOm] = useState<Map<string, OmAramaSonuc | null | 'hata'>>(new Map());
  const oku = async (zorla = false) => {
    setYuk(true);
    try {
      const [p, s] = await Promise.all([backend.rakipPazar(zorla).catch(() => null), backend.sorulanRafa(90).catch(() => [] as SorulanRafa[])]);
      setPazar(p ? { urunler: p.urunler, sayfa: p.sayfa, taranan: p.taranan } : { urunler: [], sayfa: 0, taranan: 0 }); setSorulan(s);
    } catch (e) { toast(`Okunamadı: ${(e as Error).message}`, 'hata'); } finally { setYuk(false); }
  };
  useEffect(() => { oku(); }, []);

  // ---------- müşterilerimizin araç markaları (son 6 ay satış cirosu) ----------
  const markaPay = useMemo(() => {
    const d: Donem = { bas: gunu(new Date(Date.now() - 179 * 864e5)), bit: gunu() };
    const a = aracAnalizi(db, d).markalar.filter((m) => m.ciro > 0);
    const top = a.reduce((t, m) => t + m.ciro, 0) || 1;
    return a.map((m) => ({ marka: sade(m.marka), ad: m.marka, pay: m.ciro / top }));
  }, [db]);
  const pazarMarkalar = useMemo(() => new Set((pazar?.urunler ?? []).flatMap((x) => x.araclar)), [pazar]);
  const markaSecenek = markaPay.filter((m) => pazarMarkalar.has(m.marka) || !pazar?.urunler.length);
  const varsayilanMarka = useMemo(() => {
    const l = markaSecenek.filter((m) => m.pay >= 0.05).slice(0, 6).map((m) => m.marka);
    return l.length ? l : markaSecenek.slice(0, 4).map((m) => m.marka);
  }, [markaSecenek]); // eslint-disable-line react-hooks/exhaustive-deps
  const markalar = secMarka ?? varsayilanMarka;
  const payMap = new Map(markaPay.map((m) => [m.marka, m.pay]));

  // ---------- 1) bizde düzenli satılıp biten / bitmek üzere olanlar ----------
  const biten = useMemo<Satir[]>(() => {
    const simdi = Date.now(); const hedefGun = db.ayarlar.hedef_gun || 30;
    const d60: Donem = { bas: gunu(new Date(simdi - 59 * 864e5)), bit: gunu() };
    const d180: Donem = { bas: gunu(new Date(simdi - 179 * 864e5)), bit: gunu() };
    const gun60 = takipGunu(db, d60); const oz = urunOzetleri(db, d60);
    const dz = new Map<string, { ay: Set<number>; belge: Set<string>; mus: Set<string>; son: number }>();
    for (const h of gecerliHareketler(db, d180)) {
      if (h.tur !== 'satis' || h.miktar <= 0) continue;
      const x = dz.get(h.urun_id) ?? { ay: new Set(), belge: new Set(), mus: new Set(), son: 0 }; dz.set(h.urun_id, x);
      const t = new Date(h.tarih).getTime(); const belge = h.belge_guid ?? h.tarih.slice(0, 10);
      x.ay.add(Math.min(5, Math.floor((simdi - t) / (30 * 864e5)))); x.belge.add(belge);
      const cari = h.cari_guid || h.cari_ad || ''; x.mus.add(!cari || PERAKENDE_RE.test(h.cari_ad ?? '') ? `b:${belge}` : `c:${cari}`);
      if (t > x.son) x.son = t;
    }
    const siparisteki = new Set(db.stok_aksiyon.filter((a) => a.aksiyon === 'siparis' && a.durum === 'planlandi').map((a) => a.urun_id));
    return db.urunler.filter((u) => u.aktif && stokluMu(u) && !siparisteki.has(u.id)).flatMap((u) => {
      const z = dz.get(u.id); if (!z) return [];
      const ay3 = [0, 1, 2].filter((i) => z.ay.has(i)).length;
      const kesin = simdi - z.son <= 60 * 864e5 && z.belge.size >= 3 && z.mus.size >= 2 && (z.ay.size >= 3 || ay3 >= 2);
      if (!kesin) return [];
      const h = alinacakHesap(u, oz.get(u.id)?.satilan ?? 0, gun60, hedefGun);
      if (!(u.stok <= 0 || h.yeterGun < 14 || kritikAltinda(u)) || h.alinacak <= 0) return [];
      const muadil = u.stok <= 0 ? stoktakiMuadiller(db, u).reduce((t, v) => t + v.stok, 0) : 0;
      if (muadil >= h.alinacak) return [];
      const neden = u.stok <= 0 ? `Bitti · ayda ~${sayi(Math.round(h.hiz * 30))} satılıyor` : `Stok ${sayi(u.stok)} · ${Math.max(0, Math.round(h.yeterGun))} gün yeter`;
      return [{ anahtar: `u:${u.id}`, kaynak: 'biten' as const, kod: u.kod ?? '', ad: u.ad, marka: u.marka ?? null, neden, adet: h.alinacak, urunId: u.id,
        alis: u.alis_fiyati > 0 ? u.alis_fiyati : null, pazarFiyat: null, pazarUrl: null, puan: h.hiz * 30 * (u.stok <= 0 ? 3 : 1.5) * 10 + z.mus.size,
        araclar: [], etiket: [`${z.belge.size} fatura`, `${z.mus.size} müşteri`, ...(muadil > 0 ? [`stokta muadil ${sayi(muadil)}`] : [])] }];
    }).sort((a, b) => b.puan - a.puan);
  }, [db]);

  // ---------- 2) tezgâhta sorulup bizde olmayanlar ----------
  const pazarKod = useMemo(() => { const m = new Map<string, RakipUrun>(); for (const x of pazar?.urunler ?? []) { const k = norm(x.kod); if (k.length >= 4 && !m.has(k)) m.set(k, x); } return m; }, [pazar]);
  const sorulanS = useMemo<Satir[]>(() => {
    const bitenId = new Set(biten.map((x) => x.urunId));
    return sorulan.filter((x) => x.kez >= 2 && (!x.urun_id || (x.bizim_stok ?? 0) <= 0) && !bitenId.has(x.urun_id)).map((x) => {
      const p = pazarKod.get(x.kod_norm);
      return { anahtar: `s:${x.anahtar}`, kaynak: 'sorulan' as const, kod: x.metin.trim().toUpperCase(), ad: x.bizim_ad ?? x.rakip_ad ?? p?.ad ?? '(bizde kartı yok)',
        marka: x.rakip_uretici ?? p?.uretici ?? null, neden: `${x.kez} kez soruldu · son ${tarih(x.son)}`, adet: Math.min(4, Math.max(1, Math.round(x.adet / 2))),
        urunId: x.urun_id, alis: null, pazarFiyat: x.rakip_fiyat ?? p?.fiyat ?? null, pazarUrl: x.rakip_url ?? p?.url ?? null, puan: x.kez * 10 + (p ? p.puan : 0),
        araclar: p?.araclar ?? [], etiket: [...(p ? ['pazarda da çok satılıyor'] : []), ...(x.urun_id ? ['kartı var, stok 0'] : [])] };
    }).sort((a, b) => b.puan - a.puan);
  }, [sorulan, biten, pazarKod]);

  // ---------- 3) pazarda çok satılan, müşterilerimizin araçlarına uyan, bizde olmayanlar ----------
  const pazarTum = useMemo<Satir[]>(() => {
    const kullanilan = new Set([...sorulanS.map((x) => norm(x.kod)), ...biten.map((x) => norm(x.kod))]);
    const bitenId = new Set(biten.map((x) => x.urunId));
    const sec = new Set(markalar);
    const gorulen = new Set<string>();
    return (pazar?.urunler ?? []).filter((x) => (!x.urun_id || (x.bizim_stok ?? 0) <= 0) && x.stokta !== false && x.kod && x.araclar.some((a) => sec.has(a)) && !bitenId.has(x.urun_id))
      .flatMap((x) => {
        const k = norm(x.kod); if (kullanilan.has(k) || gorulen.has(k)) return []; gorulen.add(k);
        const uyan = x.araclar.filter((a) => sec.has(a)); const pay = uyan.reduce((t, a) => t + (payMap.get(a) ?? 0), 0);
        const hizli = HIZLI_KAT.test(x.kategori ?? '');
        return [{ anahtar: `p:${x.url}`, kaynak: 'pazar' as const, kod: (x.kod ?? '').toUpperCase(), ad: x.ad ?? x.url, marka: x.uretici, neden: `${katAd(x.kategori)} · ${x.gorulme} listede üstte`,
          adet: 1, urunId: x.urun_id, alis: null, pazarFiyat: x.fiyat, pazarUrl: x.url, puan: x.puan * (1 + 2 * pay) * (hizli ? 1.5 : 1), araclar: uyan,
          etiket: [...(hizli ? ['hızlı giden kategori'] : []), ...(x.urun_id ? ['kartı var, stok 0'] : [])] }];
      }).sort((a, b) => b.puan - a.puan);
  }, [pazar, markalar, sorulanS, biten]); // eslint-disable-line react-hooks/exhaustive-deps
  const pazarS = pazarTum.slice(0, pazarSay);

  const bolumler: { k: Kaynak; l: Satir[] }[] = [{ k: 'biten', l: biten }, { k: 'sorulan', l: sorulanS }, { k: 'pazar', l: pazarS }];
  const hepsi = bolumler.filter((b) => !kapali.has(b.k)).flatMap((b) => b.l);
  const bitenTutar = biten.reduce((t, x) => t + x.adet * (x.alis ?? 0), 0);
  const listeMetni = (l: Satir[]) => [`${db.ayarlar.firma_adi} — Bu hafta alınacaklar (${tarih(new Date().toISOString())})`, '',
    ...l.map((x) => `• ${x.kod || x.ad}${x.marka ? ` (${x.marka})` : ''} — ${x.adet} adet`), '', `Toplam ${l.length} kalem`].join('\n');
  const csv = () => {
    const sat = (a: (string | number | null | undefined)[]) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['Neden', 'Kod', 'Parça', 'Marka / üretici', 'Açıklama', 'Önerilen adet', 'Araçlar', 'Pazar fiyatı', ...(maliyetGor ? ['Son alış'] : [])]),
      ...hepsi.map((x) => sat([KAYNAK[x.kaynak].ad, x.kod, x.ad, x.marka, x.neden, x.adet, x.araclar.map(aracAd).join(' '), x.pazarFiyat, ...(maliyetGor ? [x.alis] : [])]))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); a.download = `bu-hafta-alinacaklar-${gunu()}.csv`; a.click();
  };
  // Otomarmara + Neko'da listedeki kodların depo stokları ve (yöneticiye) fiyatı; Neko 25'erli, Otomarmara kod kod (6 saat önbellekli)
  const nekoGetir = async () => {
    const kodlar = [...new Set(hepsi.map((x) => x.kod).filter((k) => k && !(neko.has(k) && om.has(k))))];
    if (!kodlar.length) { toast('Listedeki kodlar zaten getirildi'); return; }
    const m = new Map(neko); const o = new Map(om); let bitenOm = 0, bitenNeko = 0;
    const durum = () => setNekoYuk(`${Math.min(bitenOm, kodlar.length)} + ${Math.min(bitenNeko, kodlar.length)} / ${kodlar.length}`);
    const nekoIs = (async () => {
      const nk = kodlar.filter((k) => !m.has(k));
      for (let i = 0; i < nk.length; i += 25) {
        try { for (const r of await backend.nekoToplu(nk.slice(i, i + 25))) if (!r.yarim) m.set(r.kod, r); } catch (e) { toast(`Neko: ${(e as Error).message}`, 'hata'); break; }
        bitenNeko = i + 25; durum(); setNeko(new Map(m));
      }
    })();
    const omIs = (async () => {
      for (const k of kodlar.filter((k) => !o.has(k))) {
        try { const y = await backend.omAra(k); const kn = tedKod(k); o.set(k, y.sonuclar.find((s) => tedKod(s.kod) === kn) ?? null); } catch { o.set(k, 'hata'); }
        bitenOm++; durum(); setOm(new Map(o));
      }
    })();
    durum();
    await Promise.all([nekoIs, omIs]);
    setNekoYuk(null);
    toast(`Otomarmara: ${[...o.values()].filter((s) => s && s !== 'hata' && omDurum(s) === 'var').length} stokta · Neko: ${[...m.values()].filter((r) => r.en?.var).length} stokta`);
  };
  const nekoHucre = (kod: string, urunId: string | null) => {
    const r = neko.get(kod); const s = om.get(kod);
    if (!r && s === undefined) return null;
    const bizde = urunId ? depolar.map((d) => ({ d, n: harita.get(urunId)?.get(d.id) ?? 0 })) : [];
    const ne = r?.en;
    return <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-tight">
      <span className="flex items-center gap-1"><span className="text-slate-500">Otomarmara</span>
        {s === undefined ? <span className="text-slate-400">…</span> : s === 'hata' ? <span className="text-red-600">hata</span> : !s ? <span className="text-slate-400">aynı kod yok</span>
          : <Durum d={omDurum(s)} baslik="Otomarmara" />}
        {s && s !== 'hata' && s.fiyat?.nakit ? <b className="ml-1">{para(s.fiyat.nakit)}</b> : null}</span>
      <span className="flex items-center gap-1"><span className="text-slate-500">Neko</span>
        {!r ? <span className="text-slate-400">…</span> : r.hata ? <span className="text-red-600">hata</span> : !ne ? <span className="text-slate-400">aynı kod yok</span>
          : <><Durum d={ne.var ? 'var' : ne.stokDurum === 'YOLDA' ? 'tedarik' : 'yok'} baslik="Neko" />{ne.netKdv !== null && <b>{para(ne.netKdv)}</b>}</>}</span>
      {bizde.map(({ d, n }) => <span key={d.id} className="flex items-center gap-1"><span className="text-slate-500">{depoKisa(d.ad)}</span><Durum d={n > 0 ? 'var' : 'yok'} baslik={d.ad} />{n > 0 && <span className="text-emerald-700">{sayi(n)}</span>}</span>)}
    </div>;
  };
  const markaDegis = (m: string) => { const s = new Set(markalar); if (s.has(m)) s.delete(m); else s.add(m); setSecMarka([...s]); };

  return (
    <div>
      <SayfaBaslik baslik="Bu Hafta Alınacaklar" alt="Kendi satışımız + tezgâhta sorulanlar + pazarda çok satılanlar → tek sipariş listesi, en önemlisi en üstte">
        <button className="btn-ghost" onClick={() => oku(true)} disabled={yuk}><RefreshCw size={16} className={yuk ? 'animate-spin' : ''} /> Yenile</button>
        <button className="btn-ghost" disabled={!hepsi.length} onClick={() => { const k = hepsi.map((x) => x.kod).filter(Boolean); kopyala(k.join('\n'), `${k.length} kod kopyalandı`); }}><Copy size={16} /> Kodları kopyala</button>
        <button className="btn-ghost" disabled={!hepsi.length} onClick={() => kopyala(listeMetni(hepsi), 'Liste kopyalandı (WhatsApp\'a yapıştırabilirsiniz)')}><MessageSquare size={16} /> Liste metni</button>
        <button className="btn-ghost" disabled={!hepsi.length || !!nekoYuk} onClick={nekoGetir}>{nekoYuk ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />} {nekoYuk ? `Tedarikçiler ${nekoYuk}` : 'Otomarmara + Neko stok'}</button>
        <button className="btn-ghost" disabled={!hepsi.length} onClick={csv}><Download size={16} /> CSV</button>
      </SayfaBaslik>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Toplam kalem" deger={sayi(hepsi.length)} alt="Seçili bölümlerde" />
        <Kpi etiket="Bitiyor (kendi satışımız)" deger={sayi(biten.length)} alt={maliyetGor && bitenTutar ? `~${para(bitenTutar)} son alış fiyatıyla` : 'Düzenli satılan ürünler'} renk="red" />
        <Kpi etiket="Tezgâhta soruldu, yok" deger={sayi(sorulanS.length)} alt="Son 90 günde en az 2 kez" renk="amber" />
        <Kpi etiket="Pazarda çok satılıyor" deger={sayi(pazarS.length)} alt={`${sayi(pazarTum.length)} aday içinden en iyileri`} renk="blue" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm font-medium text-slate-600 dark:text-slate-300">Müşterilerimizin araçları:</span>
        {markaSecenek.slice(0, 14).map((m) => <button key={m.marka} onClick={() => markaDegis(m.marka)} className={`rounded-full px-3 py-1.5 text-sm ${markalar.includes(m.marka) ? 'bg-marka-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}>{m.ad} <span className="opacity-60">%{Math.round(m.pay * 100)}</span></button>)}
        {secMarka && <button className="text-xs text-slate-500 hover:underline" onClick={() => setSecMarka(null)}>varsayılana dön</button>}
        <span className="ml-auto flex items-center gap-1.5 text-sm">Pazardan en fazla
          <select className="inp w-20 py-1" value={pazarSay} onChange={(e) => { setPazarSay(Number(e.target.value)); yerel.yaz('buhafta_pazar', e.target.value); }}>{[20, 40, 80, 150].map((n) => <option key={n} value={n}>{n}</option>)}</select> kalem</span>
      </div>
      {pazar && pazar.sayfa > 0 && pazar.taranan < pazar.sayfa * 0.5 && <div className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Pazar taraması sürüyor ({sayi(pazar.taranan)} / {sayi(pazar.sayfa)} sayfa). Hızlı giden kategoriler önce taranıyor; "pazarda çok satılıyor" bölümü her gün daha isabetli olur.</div>}

      {!pazar ? <div className="card p-6 text-center text-sm text-slate-500">Yükleniyor…</div> : (
        <div className="space-y-4">
          {bolumler.map(({ k, l }) => {
            const acik = !kapali.has(k);
            return (
              <div key={k} className="card">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
                  <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={acik} onChange={() => { const s = new Set(kapali); if (acik) s.add(k); else s.delete(k); setKapali(s); }} />
                    <span className={`rozet ${KAYNAK[k].renk}`}>{KAYNAK[k].ad}</span> <b>{sayi(l.length)}</b></label>
                  <span className="text-xs text-slate-500">{KAYNAK[k].aciklama}</span>
                  <button className="btn-ghost ml-auto py-1 text-xs" disabled={!l.length} onClick={() => { const c = l.map((x) => x.kod).filter(Boolean); kopyala(c.join('\n'), `${c.length} kod kopyalandı`); }}><Copy size={13} /> Kodları kopyala</button>
                </div>
                {acik && (l.length === 0 ? <Bos metin={k === 'pazar' ? 'Seçili araç markalarında bizde olmayan pazar ürünü yok (ya da tarama henüz bu kategorilere gelmedi).' : k === 'sorulan' ? 'En az 2 kez sorulup bizde olmayan parça yok.' : 'Düzenli satılıp biten ürün yok.'} /> : (
                  <div className="max-h-[55vh] overflow-auto">
                    <table className="tbl">
                      <thead><tr><th className="w-8">#</th><th>Kod</th><th>Parça</th><th>Neden</th><th className="text-right">Önerilen</th><th className="text-right">{k === 'biten' ? (maliyetGor ? 'Son alış' : '') : 'Pazar fiyatı'}</th><th /></tr></thead>
                      <tbody>{l.map((x, i) => (
                        <tr key={x.anahtar} className="align-top">
                          <td className="text-slate-400">{i + 1}</td>
                          <td>{x.kod ? <button className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800" onClick={() => kopyala(x.kod, `${x.kod} kopyalandı`)}>{x.kod} <Copy size={11} /></button> : '—'}</td>
                          <td>{x.urunId ? <UrunLink id={x.urunId}>{x.ad}</UrunLink> : x.pazarUrl ? <a href={x.pazarUrl} target="_blank" rel="noreferrer" className="hover:underline">{x.ad} <ExternalLink size={10} className="inline" /></a> : x.ad}
                            <div className="text-xs text-slate-500">{[x.marka, x.araclar.length ? x.araclar.map(aracAd).join(', ') : null].filter(Boolean).join(' · ')}
                              {x.etiket.map((e) => <span key={e} className="ml-1 rozet bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{e}</span>)}</div>
                            {omAcik === x.anahtar && <div className="mt-2"><TedarikciArama q={x.kod || x.ad} oto maliyet={maliyetGor} /></div>}</td>
                          <td className="text-sm">{x.neden}{nekoHucre(x.kod, x.urunId)}</td>
                          <td className="text-right font-semibold">{x.adet} <span className="text-xs font-normal text-slate-500">{k === 'pazar' ? 'deneme' : 'adet'}</span></td>
                          <td className="text-right text-sm">{k === 'biten' ? (maliyetGor && x.alis ? para(x.alis) : '') : x.pazarFiyat ? para(x.pazarFiyat) : '—'}</td>
                          <td><button className="btn-ghost whitespace-nowrap py-1 text-xs" onClick={() => setOmAcik(omAcik === x.anahtar ? null : x.anahtar)}>{omAcik === x.anahtar ? 'Kapat' : "Tedarikçide ara"}</button></td>
                        </tr>))}</tbody>
                    </table>
                  </div>))}
              </div>);
          })}
        </div>)}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" />Liste her açılışta yeniden hesaplanır: ürün BizimHesap'a alış faturasıyla girip stoğa düşünce kendiliğinden listeden çıkar. "Bitiyor" bölümünde sipariş verildi olarak işaretlenmiş ürünler (Kritik stok & alınacaklar sekmesi) gösterilmez. Pazar ürünleri için ilk alımda 1 adet (deneme) önerilir; satılırsa sonraki hafta "bitiyor" listesine kendiliğinden girer. Araç markası payı son 6 ayın satış cirosundan (müşteri adındaki araç ya da ürün adındaki uyumluluk) hesaplanır. Rafa almadan önce tedarikçi fiyatını Otomarmara düğmesiyle kontrol edin.</p>
    </div>
  );
}
