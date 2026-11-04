import { Fragment, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { ara, gunu, para, sayi, tarih, tarihSaat } from '../lib/format';
import { donemde, GECIS_RE, hareketTutar, hizmetMi } from '../lib/analiz';
import type { Hareket } from '../lib/types';
import { DonemSecici, useDonem } from '../components/DonemSecici';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { MusteriLink, UrunLink } from '../components/DetayKart';

type Gorunum = 'satir' | 'fatura' | 'ozet';
type Satir = Hareket & { eksik?: boolean };

export default function Hareketler() {
  const { db, calistir, izin } = useStore(); const maliyetGor = izin('maliyet');
  const [d, setD] = useDonem();
  const [tur, setTur] = useState<'' | 'satis' | 'alis'>('');
  const [q, setQ] = useState('');
  const [cari, setCari] = useState('');
  const [yokSay, setYokSay] = useState(false);
  const [sadeceEksik, setSadeceEksik] = useState(false);
  const [sadeceZarar, setSadeceZarar] = useState(false);
  const [gorunum, setGorunum] = useState<Gorunum>('satir');
  const [acik, setAcik] = useState<Set<string>>(new Set());
  const [goster, setGoster] = useState(300);
  const urun = useMemo(() => new Map(db.urunler.map((u) => [u.id, u])), [db.urunler]);
  const a = db.ayarlar;
  // işçilik / hizmet satırlarının maliyeti yoktur: KDV hariç tutarın tamamı kâr sayılır (araç alım-satım hariç)
  const hTutar = (h: Hareket) => {
    const x = hareketTutar(h, a); if (!x.maliyetYok || h.tur !== 'satis') return x;
    const u = urun.get(h.urun_id); const ad = u?.ad ?? h.urun_ad ?? '';
    return !GECIS_RE.test(ad) && hizmetMi(h, u) ? { ...x, kar: x.ciroNet, maliyetYok: false } : x;
  };
  const raporSon = db.bh_durum?.rapor_son ?? null;

  // iade belgeleri (satış iadesi: müşteriden geri, alış iadesi: tedarikçiye) listede gösterilir, toplamlara katılmaz
  const iadeSet = useMemo(() => new Set<Hareket>(db.iadeler ?? []), [db.iadeler]);

  // Faturası eksik: fatura raporu olan günlerde, bir ürünün o gün stoktan net çıkışı faturalı net çıkışından fazlaysa
  // aradaki stok çıkış satırları "faturası yok" diye listeye eklenir (aynı miktarda 1 saat içinde geri girenler birbirini götürür)
  const eksikler = useMemo(() => {
    if (!raporSon) return [] as Satir[];
    const stk = (db.stok_degisim ?? []).filter((h) => !h.yok_say && donemde(h.tarih, d) && gunu(h.tarih) <= raporSon).sort((x, y) => x.tarih.localeCompare(y.tarih));
    const esli = new Set<Hareket>();
    for (let i = 0; i < stk.length; i++) {
      const x = stk[i]; if (esli.has(x)) continue;
      for (let j = i + 1; j < stk.length; j++) {
        const y = stk[j]; if (new Date(y.tarih).getTime() - new Date(x.tarih).getTime() > 3600e3) break;
        if (!esli.has(y) && y.urun_id === x.urun_id && y.tur !== x.tur && Math.abs(y.miktar - x.miktar) < 0.001) { esli.add(x); esli.add(y); break; }
      }
    }
    const anahtar = (h: Hareket) => `${h.urun_id}|${gunu(h.tarih)}`;
    // açıklanamayan çıkış = stok çıkışı − faturalı satış − alış iadesi; açıklanamayan giriş (elle düzeltme) bunu azaltır.
    // Alış faturası stoğa başka gün girebildiği için fazla alış faturası "eksik" üretmez.
    const cik = new Map<string, number>(), gir = new Map<string, number>();
    const ekle = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
    for (const h of stk) if (!esli.has(h)) ekle(h.tur === 'satis' ? cik : gir, anahtar(h), h.miktar);
    for (const h of db.hareketler) if (h.kaynak === 'fatura' && cik.has(anahtar(h))) ekle(h.tur === 'satis' ? cik : gir, anahtar(h), -h.miktar);
    for (const h of db.iadeler ?? []) if (cik.has(anahtar(h))) ekle(h.tur === 'alis' ? cik : gir, anahtar(h), -h.miktar);
    const net = new Map<string, number>();
    for (const [k, c] of cik) net.set(k, c - Math.max(0, gir.get(k) ?? 0));
    const out: Satir[] = [];
    for (const h of [...stk].reverse()) {
      if (esli.has(h) || h.tur !== 'satis') continue;
      const k = anahtar(h); const kalan = net.get(k) ?? 0; if (kalan < 0.5) continue;
      out.push({ ...h, kaynak: 'stok', eksik: true }); net.set(k, kalan - h.miktar);
    }
    return out;
  }, [db.stok_degisim, db.hareketler, db.iadeler, d, raporSon]);

  // fatura raporu olan günlerde liste fatura satırlarını gösterir; o günlerin hesap dışı bırakılan ve faturası eksik stok hareketleri ayrıca eklenir
  const tum = useMemo(() => {
    const ids = new Set(db.hareketler.map((h) => h.id)); const eks = new Set(eksikler.map((h) => h.id));
    const disari = (db.stok_degisim ?? []).filter((h) => h.yok_say && !ids.has(h.id) && !eks.has(h.id));
    return [...db.hareketler, ...(db.iadeler ?? []), ...disari, ...eksikler].sort((x, y) => y.tarih.localeCompare(x.tarih)) as Satir[];
  }, [db.hareketler, db.iadeler, db.stok_degisim, eksikler]);
  const cariler = useMemo(() => [...new Set(tum.filter((h) => donemde(h.tarih, d) && h.cari_ad).map((h) => h.cari_ad!))].sort((x, y) => x.localeCompare(y, 'tr')), [tum, d]);
  const iadeSet0 = useMemo(() => new Set<Hareket>(db.iadeler ?? []), [db.iadeler]);
  const zararMi = (h: Satir) => { if (h.tur !== 'satis' || h.yok_say || h.eksik || iadeSet0.has(h)) return false; const x = hTutar(h); return !x.maliyetYok && x.kar < -0.01; };
  const uyar = (h: Satir) => (!tur || h.tur === tur) && (yokSay || !h.yok_say) && (!sadeceEksik || h.eksik) && (!sadeceZarar || zararMi(h)) && (!cari || h.cari_ad === cari) &&
    (!q.trim() || (() => { const u = urun.get(h.urun_id); return ara(q, u?.ad ?? h.urun_ad, u?.kod, u?.barkod, u?.marka, u?.kategori, h.cari_ad, h.kullanici); })());
  const liste = useMemo(() => tum.filter((h) => donemde(h.tarih, d) && uyar(h)), [tum, d, tur, q, yokSay, sadeceEksik, sadeceZarar, cari, urun, a]); // eslint-disable-line react-hooks/exhaustive-deps
  // önceki dönem: seçili dönemle aynı uzunlukta, hemen öncesi
  const dOnce = useMemo(() => {
    const b = new Date(d.bas + 'T12:00:00'), e = new Date(d.bit + 'T12:00:00'); const n = Math.round((e.getTime() - b.getTime()) / 864e5) + 1;
    const ob = new Date(b); ob.setDate(ob.getDate() - n); const oe = new Date(b); oe.setDate(oe.getDate() - 1);
    return { bas: gunu(ob), bit: gunu(oe), n };
  }, [d]);
  const oncekiListe = useMemo(() => tum.filter((h) => donemde(h.tarih, dOnce) && uyar(h)), [tum, dOnce, tur, q, yokSay, sadeceEksik, sadeceZarar, cari, urun, a]); // eslint-disable-line react-hooks/exhaustive-deps
  const zararSay = useMemo(() => tum.filter((h) => donemde(h.tarih, d) && zararMi(h)).length, [tum, d, a]); // eslint-disable-line react-hooks/exhaustive-deps
  const sayilir = (h: Satir) => !h.yok_say && !h.eksik && !iadeSet.has(h);
  const topla = (l: Satir[]) => {
    let ciro = 0, kar = 0, adet = 0, alis = 0, alAdet = 0, iadeSatis = 0, iadeAlis = 0, iadeSay = 0;
    for (const h of l) {
      if (h.yok_say || h.eksik) continue;
      if (iadeSet.has(h)) { iadeSay++; if (h.tur === 'satis') iadeSatis += h.miktar * h.satis_fiyati; else iadeAlis += h.miktar * h.alis_fiyati; continue; }
      if (h.tur === 'satis') { const x = hTutar(h); ciro += x.ciro; kar += x.kar; adet += h.miktar; }
      else { alis += h.miktar * h.alis_fiyati; alAdet += h.miktar; }
    }
    return { ciro, kar, adet, alis, alAdet, iadeSatis, iadeAlis, iadeSay };
  };
  const top = useMemo(() => topla(liste), [liste, a, iadeSet]); // eslint-disable-line react-hooks/exhaustive-deps
  const onc = useMemo(() => topla(oncekiListe), [oncekiListe, a, iadeSet]); // eslint-disable-line react-hooks/exhaustive-deps
  const fark = (x: number, y: number) => {
    if (!y) return null; const p = ((x - y) / Math.abs(y)) * 100;
    return <span className={p >= 0 ? 'text-emerald-600' : 'text-red-600'}>{p >= 0 ? '▲' : '▼'}%{Math.abs(p).toFixed(0)} <span className="text-slate-400">önceki {dOnce.n} güne göre</span></span>;
  };
  const yokSayilan = tum.filter((h) => h.yok_say && donemde(h.tarih, d)).length;
  const eksikDonem = eksikler.length;

  // günlük ciro / kâr (seçili dönem, filtrelerle)
  const gunluk = useMemo(() => {
    const m = new Map<string, { ciro: number; kar: number }>();
    for (let t = new Date(d.bas + 'T12:00:00'); gunu(t) <= d.bit && m.size < 400; t.setDate(t.getDate() + 1)) m.set(gunu(t), { ciro: 0, kar: 0 });
    for (const h of liste) { if (h.tur !== 'satis' || !sayilir(h)) continue; const g = m.get(gunu(h.tarih)); if (!g) continue; const x = hTutar(h); g.ciro += x.ciro; g.kar += x.kar; }
    return [...m.entries()].map(([gun, v]) => ({ gun, ...v }));
  }, [liste, d, a]); // eslint-disable-line react-hooks/exhaustive-deps
  const enCok = Math.max(1, ...gunluk.map((g) => g.ciro));
  const satisliGun = gunluk.filter((g) => g.ciro > 0);
  const enIyi = satisliGun.reduce<(typeof gunluk)[number] | null>((m, g) => (!m || g.ciro > m.ciro ? g : m), null);
  const enKotu = satisliGun.reduce<(typeof gunluk)[number] | null>((m, g) => (!m || g.ciro < m.ciro ? g : m), null);

  // faturalar: aynı belgedeki satırlar (stok satırları tek başına)
  const faturalar = useMemo(() => {
    const m = new Map<string, Satir[]>();
    for (const h of liste) { const k = h.kaynak === 'fatura' && h.belge_guid ? `b:${h.belge_guid}` : `h:${h.id}`; const l = m.get(k) ?? []; l.push(h); m.set(k, l); }
    return [...m.entries()].map(([k, l]) => {
      let tutar = 0, kar = 0;
      for (const h of l) { if (!sayilir(h)) continue; const x = hTutar(h); if (h.tur === 'satis') { tutar += x.ciro; kar += x.kar; } else tutar += h.miktar * h.alis_fiyati; }
      const h0 = l[0];
      return { k, l, h0, tutar, kar, adet: l.reduce((t, h) => t + h.miktar, 0) };
    }).sort((x, y) => y.h0.tarih.localeCompare(x.h0.tarih));
  }, [liste, a]); // eslint-disable-line react-hooks/exhaustive-deps

  // her carinin ilk satış günü (yeni / tekrar gelen müşteri)
  const ilkSatis = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of db.hareketler) if (h.tur === 'satis' && h.cari_ad && !h.yok_say) { const g = gunu(h.tarih); const o = m.get(h.cari_ad); if (!o || g < o) m.set(h.cari_ad, g); }
    return m;
  }, [db.hareketler]);
  // ürün ve marka özeti (satışlar)
  const ozet = useMemo(() => {
    const ur = new Map<string, { ad: string; kod: string; id: string; adet: number; ciro: number; kar: number; maliyetsiz: boolean }>();
    const mr = new Map<string, { adet: number; ciro: number; kar: number; urun: Set<string> }>();
    const kl = new Map<string, { ciro: number; kar: number; belge: Set<string> }>();
    const cr = new Map<string, { guid?: string | null; ciro: number; kar: number; belge: Set<string> }>();
    const sg = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    const kt = new Map<string, { adet: number; ciro: number; kar: number }>();
    const td = new Map<string, { adet: number; tutar: number; belge: Set<string>; urun: Set<string> }>();
    for (const h of liste) {
      if (h.tur !== 'alis' || !sayilir(h)) continue;
      const k = h.cari_ad || 'Tedarikçi belirtilmemiş (tahmini)'; const v = td.get(k) ?? { adet: 0, tutar: 0, belge: new Set<string>(), urun: new Set<string>() };
      v.adet += h.miktar; v.tutar += h.miktar * h.alis_fiyati; v.belge.add(h.belge_guid || String(h.id)); v.urun.add(h.urun_id); td.set(k, v);
    }
    for (const h of liste) {
      if (h.tur !== 'satis' || !sayilir(h)) continue;
      const u = urun.get(h.urun_id); const x = hTutar(h);
      const e = ur.get(h.urun_id) ?? { ad: u?.ad ?? h.urun_ad ?? '—', kod: u?.kod ?? '', id: h.urun_id, adet: 0, ciro: 0, kar: 0, maliyetsiz: true };
      e.adet += h.miktar; e.ciro += x.ciro; e.kar += x.kar; if (!x.maliyetYok) e.maliyetsiz = false; ur.set(h.urun_id, e);
      const mk = (u?.marka || 'Markasız').trim(); const b = mr.get(mk) ?? { adet: 0, ciro: 0, kar: 0, urun: new Set<string>() };
      b.adet += h.miktar; b.ciro += x.ciro; b.kar += x.kar; b.urun.add(h.urun_id); mr.set(mk, b);
      const belge = h.belge_guid || String(h.id);
      const kk = h.kullanici || (h.kaynak === 'fatura' ? 'Belirtilmemiş' : 'Stok hareketi (tahmini)'); const kv = kl.get(kk) ?? { ciro: 0, kar: 0, belge: new Set<string>() };
      kv.ciro += x.ciro; kv.kar += x.kar; kv.belge.add(belge); kl.set(kk, kv);
      if (h.cari_ad) { const cv = cr.get(h.cari_ad) ?? { guid: h.cari_guid, ciro: 0, kar: 0, belge: new Set<string>() }; cv.ciro += x.ciro; cv.kar += x.kar; cv.belge.add(belge); cr.set(h.cari_ad, cv); }
      const t = new Date(h.tarih); sg[(t.getDay() + 6) % 7][t.getHours()] += x.ciro;
      const kk2 = (u?.kategori || 'Kategorisiz').trim(); const kv2 = kt.get(kk2) ?? { adet: 0, ciro: 0, kar: 0 }; kv2.adet += h.miktar; kv2.ciro += x.ciro; kv2.kar += x.kar; kt.set(kk2, kv2);
    }
    return { urunler: [...ur.values()].sort((x, y) => y.ciro - x.ciro).slice(0, 25), markalar: [...mr.entries()].map(([ad, v]) => ({ ad, ...v, cesit: v.urun.size })).sort((x, y) => y.ciro - x.ciro).slice(0, 20),
      kullanicilar: [...kl.entries()].map(([ad, v]) => ({ ad, ciro: v.ciro, kar: v.kar, belge: v.belge.size })).sort((x, y) => y.ciro - x.ciro),
      cariler: [...cr.entries()].map(([ad, v]) => ({ ad, guid: v.guid, ciro: v.ciro, kar: v.kar, belge: v.belge.size, ilk: ilkSatis.get(ad) })).sort((x, y) => y.ciro - x.ciro).slice(0, 15), sg,
      kategoriler: [...kt.entries()].map(([ad, v]) => ({ ad, ...v })).sort((x, y) => y.ciro - x.ciro).slice(0, 15),
      tedarikciler: [...td.entries()].map(([ad, v]) => ({ ad, adet: v.adet, tutar: v.tutar, belge: v.belge.size, cesit: v.urun.size })).sort((x, y) => y.tutar - x.tutar).slice(0, 15),
      yeniCari: [...cr.keys()].filter((c) => (ilkSatis.get(c) ?? '') >= d.bas).length, toplamCari: cr.size };
  }, [liste, urun, a, ilkSatis, d]); // eslint-disable-line react-hooks/exhaustive-deps

  const degistir = (h: Hareket) => calistir(() => backend.update<Hareket>('hareketler', h.id, { yok_say: !h.yok_say }), h.yok_say ? 'Hareket hesaba katıldı' : 'Hareket hesaplardan çıkarıldı');
  const turAd = (h: Satir) => (iadeSet.has(h) ? (h.tur === 'satis' ? 'Satış iadesi' : 'Alış iadesi') : h.tur === 'satis' ? 'Satış' : 'Alış');
  const csv = () => {
    const sat = (x: (string | number | null | undefined)[]) => x.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['Tarih', 'Tür', 'Kaynak', 'Cari', 'Kullanıcı', 'Stok kodu', 'Ürün', 'Marka', 'Miktar', 'Önceki stok', 'Sonraki stok', 'Satış fiyatı', 'Alış fiyatı', 'Tutar', 'Kâr (KDV hariç)', 'Hesap dışı', 'Faturası yok']),
      ...liste.map((h) => { const u = urun.get(h.urun_id); const x = hTutar(h); return sat([tarihSaat(h.tarih), turAd(h), h.kaynak === 'fatura' ? 'Fatura' : 'Tahmini', h.cari_ad, h.kullanici, u?.kod, u?.ad ?? h.urun_ad, u?.marka, h.miktar, h.onceki, h.sonraki, h.satis_fiyati, maliyetGor ? h.alis_fiyati : '', h.tur === 'satis' ? x.ciro.toFixed(2) : (h.miktar * h.alis_fiyati).toFixed(2), h.tur === 'satis' && maliyetGor ? x.kar.toFixed(2) : '', h.yok_say ? 'Evet' : '', h.eksik ? 'Evet' : '']); })].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = `hareketler-${d.bas}-${d.bit}.csv`; el.click();
  };
  const zaman = (t: string) => (gunu(t) === gunu() ? 'Bugün ' + new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : tarihSaat(t));
  const sekme = (g: Gorunum, ad: string) => <button key={g} onClick={() => setGorunum(g)} className={`rounded-md px-3 py-1.5 text-sm ${gorunum === g ? 'bg-marka-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}>{ad}</button>;

  const satirTr = (h: Satir, ic = false) => {
    const u = urun.get(h.urun_id); const x = hTutar(h); const iade = iadeSet.has(h);
    return (
      <tr key={`${h.id}-${h.eksik ? 'e' : ''}`} className={`${h.yok_say ? 'opacity-40' : ''} ${h.eksik ? 'bg-red-50/70 dark:bg-red-500/10' : ''} ${ic ? 'text-[13px]' : ''}`}>
        <td className={`whitespace-nowrap text-slate-500 ${ic ? 'pl-8' : ''}`}>{zaman(h.tarih)}</td>
        <td><span className={`rozet ${iade ? 'bg-amber-50 text-amber-700' : h.tur === 'satis' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{turAd(h)}</span>
          <div className={`mt-0.5 text-[10px] ${h.eksik ? 'font-semibold text-red-600' : h.kaynak === 'fatura' ? 'text-slate-500' : 'text-amber-600'}`}>{h.eksik ? 'Faturası yok' : h.kaynak === 'fatura' ? 'Fatura' : 'Tahmini'}</div></td>
        <td><div className="font-medium"><UrunLink id={h.urun_id}>{u?.ad ?? h.urun_ad ?? 'Bilinmeyen ürün'}</UrunLink></div>
          <div className="text-xs text-slate-500">{[u?.kod, u?.marka].filter(Boolean).join(' · ')}</div></td>
        <td className="text-sm">{h.cari_ad ? (h.tur === 'satis' ? <MusteriLink guid={h.cari_guid} ad={h.cari_ad} /> : h.cari_ad) : <span className="text-slate-300">—</span>}{h.kullanici && <div className="text-[11px] text-slate-500">{h.kullanici}</div>}</td>
        <td className="text-right font-medium">{(h.tur === 'satis') !== iade ? '−' : '+'}{sayi(h.miktar)}</td>
        <td className="whitespace-nowrap text-right text-xs text-slate-500">{h.onceki != null ? `${sayi(h.onceki)} → ${sayi(h.sonraki ?? 0)}` : ''}</td>
        <td className="text-right">{para(h.tur === 'satis' ? h.satis_fiyati : h.alis_fiyati)}</td>
        <td className={`text-right font-semibold ${iade ? 'text-amber-700' : ''}`}>{para(h.tur === 'satis' ? x.ciro : h.miktar * h.alis_fiyati)}</td>
        {maliyetGor && <td className={`text-right ${h.tur !== 'satis' || iade || h.eksik ? '' : x.maliyetYok ? 'text-slate-400' : x.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{h.tur === 'satis' && !iade && !h.eksik ? (x.maliyetYok ? 'maliyet yok' : para(x.kar)) : ''}</td>}
        <td className="text-center">{h.kaynak === 'fatura' ? <span className="text-slate-300">—</span> : <input type="checkbox" checked={h.yok_say} onChange={() => degistir(h)} title={h.eksik ? 'Faturası kesilmeyecekse (sayım, kullanım, kayıp) işaretleyin: bu listeden ve Kayıp-Kaçak hesabından çıkar' : 'Sayım, düzeltme veya iade ise işaretleyin'} />}</td>
      </tr>);
  };
  const baslik = <thead><tr><th>Tarih</th><th>Tür</th><th>Ürün</th><th>Cari</th><th className="text-right">Miktar</th><th className="text-right">Stok</th><th className="text-right">Birim fiyat</th><th className="text-right">Tutar</th>{maliyetGor && <th className="text-right">Kâr</th>}<th className="text-center">Hesap dışı</th></tr></thead>;

  return (
    <div>
      <SayfaBaslik baslik="Satışlar & Alışlar" alt={raporSon ? `${raporSon.split('-').reverse().join('.')} tarihine kadar BizimHesap faturalarından (gerçek), sonrası stok değişiminden (tahmini)` : "BizimHesap'taki stok değişimlerinden otomatik çıkarılır"}>
        <button className="btn-ghost" onClick={csv} disabled={!liste.length}><Download size={16} /> Excel (CSV)</button>
      </SayfaBaslik>
      <div className="mb-3"><DonemSecici d={d} sec={setD} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Satış tutarı (KDV dahil)" deger={para(top.ciro)} alt={<>{sayi(top.adet)} adet {fark(top.ciro, onc.ciro)}</>} renk="green" />
        {maliyetGor ? <Kpi etiket="Brüt kâr (KDV hariç)" deger={para(top.kar)} alt={<>{top.ciro > 0 ? `marj %${((top.kar / (top.ciro / 1.2)) * 100).toFixed(0)} ` : ''}{fark(top.kar, onc.kar)}</>} renk={top.kar >= 0 ? 'green' : 'red'} /> : <Kpi etiket="Satış günü" deger={sayi(satisliGun.length)} alt="satış olan gün" />}
        <Kpi etiket="Alış tutarı (KDV hariç)" deger={para(top.alis)} alt={<>{sayi(top.alAdet)} adet giriş {fark(top.alis, onc.alis)}</>} renk="blue" />
        <button className="text-left" disabled={!eksikDonem} onClick={() => { setSadeceEksik((x) => !x); setGorunum('satir'); }}>
          <Kpi etiket="Faturası eksik" deger={sayi(eksikDonem)} alt={eksikDonem ? (sadeceEksik ? 'Yalnız bunlar gösteriliyor · tümüne dön' : 'Stoktan düşmüş, fatura yok · listele') : 'Fatura rapor edilen günlerde eksik yok'} renk={eksikDonem ? 'red' : 'slate'} ikon={<AlertTriangle size={16} />} /></button>
      </div>

      {gunluk.length > 1 && gunluk.length <= 120 && (
        <div className="card mb-4 p-4">
          <div className="mb-2 flex flex-wrap items-baseline gap-3 text-sm"><b>Günlük satış</b>
            {enIyi && <span className="text-xs text-slate-500">En iyi: {tarih(enIyi.gun)} · {para(enIyi.ciro)}</span>}
            {enKotu && enKotu !== enIyi && <span className="text-xs text-slate-500">En düşük: {tarih(enKotu.gun)} · {para(enKotu.ciro)}</span>}
            <span className="ml-auto flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-marka-500" />Ciro</span>{maliyetGor && <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />Kâr</span>}</span></div>
          <div className="flex h-36 items-end gap-[2px]">
            {gunluk.map((g) => (
              <div key={g.gun} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${tarih(g.gun)} · ciro ${para(g.ciro)}${maliyetGor ? ` · kâr ${para(g.kar)}` : ''}`}>
                <div className="relative w-full rounded-t-sm bg-marka-500/85 group-hover:bg-marka-600" style={{ height: `${(g.ciro / enCok) * 100}%` }}>
                  {maliyetGor && g.kar > 0 && <div className="absolute bottom-0 left-0 w-full rounded-t-sm bg-amber-400" style={{ height: `${Math.min(100, (g.kar / Math.max(g.ciro, 1)) * 100)}%` }} />}
                </div>
              </div>))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{tarih(gunluk[0].gun)}</span><span>{tarih(gunluk[gunluk.length - 1].gun)}</span></div>
        </div>)}

      <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span><b>Fatura</b> satırları BizimHesap'ın ürün alış-satış raporundan gelir (gerçek tutar, iskonto, maliyet). <b>Tahmini</b> satırlar rapor aktarılmamış günlerde stok değişiminden çıkarılır. <b className="text-red-600">Faturası yok</b>: rapor olan bir günde ürün stoktan düşmüş ama o gün faturası yok; fatura kesilecekse kesin, kesilmeyecekse (sayım, kullanım, kayıp) <b>"Hesap dışı"</b> kutusunu işaretleyin. Aynı miktarda 1 saat içinde geri alınan çıkışlar sayılmaz. <b>İade</b> belgeleri toplamlara katılmaz.</span>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <div className="flex gap-1">{sekme('satir', 'Satırlar')}{sekme('fatura', 'Faturalar')}{sekme('ozet', 'Ürün & marka')}</div>
          <input className="inp max-w-xs" placeholder="Ürün, kod, marka, cari…" value={q} onChange={(e) => { setQ(e.target.value); setGoster(300); }} />
          <select className="inp w-32" value={tur} onChange={(e) => setTur(e.target.value as typeof tur)}><option value="">Tümü</option><option value="satis">Satışlar</option><option value="alis">Alışlar</option></select>
          <select className="inp w-48" value={cari} onChange={(e) => setCari(e.target.value)}><option value="">Tüm cariler</option>{cariler.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={yokSay} onChange={(e) => setYokSay(e.target.checked)} /> Hesap dışı olanları da göster</label>
          {sadeceEksik && <button className="rozet bg-red-50 text-red-700" onClick={() => setSadeceEksik(false)}>Yalnız faturası eksikler ✕</button>}
          {maliyetGor && zararSay > 0 && <button className={`rozet ${sadeceZarar ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`} title="Maliyetinin altında satılan satırlar" onClick={() => { setSadeceZarar((x) => !x); if (gorunum === 'ozet') setGorunum('satir'); }}>Zararına satış ({zararSay}){sadeceZarar ? ' ✕' : ''}</button>}
          <span className="ml-auto text-xs text-slate-500">{gorunum === 'fatura' ? `${faturalar.length} belge` : `${liste.length} hareket`}{yokSayilan ? ` · ${yokSayilan} hesap dışı` : ''}{top.iadeSay ? ` · ${top.iadeSay} iade toplama katılmadı` : ''}</span>
        </div>

        {gorunum === 'satir' && <div className="max-h-[62vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Bu dönemde hareket yok." /> : (
            <table className="tbl">{baslik}<tbody>{liste.slice(0, goster).map((h) => satirTr(h))}</tbody></table>)}
          {liste.length > goster && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGoster((g) => g + 500)}>Daha fazla göster ({liste.length - goster})</button></div>}
        </div>}

        {gorunum === 'fatura' && <div className="max-h-[62vh] overflow-auto">
          {faturalar.length === 0 ? <Bos metin="Bu dönemde belge yok." /> : (
            <table className="tbl">
              <thead><tr><th className="w-6" /><th>Tarih</th><th>Tür</th><th>Cari</th><th className="text-right">Kalem</th><th className="text-right">Adet</th><th className="text-right">Tutar</th>{maliyetGor && <th className="text-right">Kâr</th>}</tr></thead>
              <tbody>{faturalar.slice(0, goster).map((f) => {
                const coklu = f.l.length > 1; const ac = acik.has(f.k);
                return (
                  <Fragment key={f.k}>
                    <tr className={`${coklu ? 'cursor-pointer' : ''} ${f.h0.eksik ? 'bg-red-50/70 dark:bg-red-500/10' : ''} ${f.l.every((h) => h.yok_say) ? 'opacity-40' : ''}`} onClick={() => coklu && setAcik((s) => { const y = new Set(s); if (y.has(f.k)) y.delete(f.k); else y.add(f.k); return y; })}>
                      <td>{coklu ? (ac ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}</td>
                      <td className="whitespace-nowrap text-slate-500">{zaman(f.h0.tarih)}</td>
                      <td><span className={`rozet ${iadeSet.has(f.h0) ? 'bg-amber-50 text-amber-700' : f.h0.tur === 'satis' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{turAd(f.h0)}</span>
                        <div className={`mt-0.5 text-[10px] ${f.h0.eksik ? 'font-semibold text-red-600' : f.h0.kaynak === 'fatura' ? 'text-slate-500' : 'text-amber-600'}`}>{f.h0.eksik ? 'Faturası yok' : f.h0.kaynak === 'fatura' ? 'Fatura' : 'Tahmini'}</div></td>
                      <td className="text-sm">{f.h0.cari_ad ? (f.h0.tur === 'satis' ? <MusteriLink guid={f.h0.cari_guid} ad={f.h0.cari_ad} /> : f.h0.cari_ad) : coklu ? '—' : <span className="text-slate-500">{urun.get(f.h0.urun_id)?.ad ?? f.h0.urun_ad}</span>}{f.h0.kullanici && <div className="text-[11px] text-slate-500">{f.h0.kullanici}</div>}</td>
                      <td className="text-right">{sayi(f.l.length)}</td>
                      <td className="text-right">{sayi(f.adet)}</td>
                      <td className="text-right font-semibold">{para(f.tutar)}</td>
                      {maliyetGor && <td className={`text-right ${f.h0.tur === 'satis' ? (f.kar < 0 ? 'text-red-600' : 'text-emerald-700') : ''}`}>{f.h0.tur === 'satis' && !iadeSet.has(f.h0) ? para(f.kar) : ''}</td>}
                    </tr>
                    {(ac || !coklu) && coklu && f.l.map((h) => (
                      <tr key={`i${h.id}`} className="bg-slate-50/60 text-[13px] dark:bg-slate-900/40"><td /><td colSpan={3} className="pl-2"><UrunLink id={h.urun_id}>{urun.get(h.urun_id)?.ad ?? h.urun_ad}</UrunLink> <span className="text-xs text-slate-500">{urun.get(h.urun_id)?.kod}</span></td>
                        <td /><td className="text-right">{sayi(h.miktar)}</td><td className="text-right">{para(h.tur === 'satis' ? hTutar(h).ciro : h.miktar * h.alis_fiyati)}</td>{maliyetGor && <td className="text-right text-xs">{h.tur === 'satis' ? para(hTutar(h).kar) : ''}</td>}</tr>))}
                  </Fragment>);
              })}</tbody>
            </table>)}
          {faturalar.length > goster && <div className="p-3 text-center"><button className="btn-ghost text-xs" onClick={() => setGoster((g) => g + 500)}>Daha fazla göster ({faturalar.length - goster})</button></div>}
        </div>}

        {gorunum === 'ozet' && <div className="grid gap-4 p-3 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-sm font-semibold">En çok satan ürünler <span className="font-normal text-slate-500">(ciroya göre)</span></div>
            {ozet.urunler.length === 0 ? <Bos metin="Bu dönemde satış yok." /> : (
              <table className="tbl text-sm"><thead><tr><th>Ürün</th><th className="text-right">Adet</th><th className="text-right">Ciro</th>{maliyetGor && <th className="text-right">Kâr</th>}</tr></thead>
                <tbody>{ozet.urunler.map((x) => { const st = urun.get(x.id)?.stok ?? 0; return <tr key={x.id}><td><UrunLink id={x.id}>{x.ad}</UrunLink><div className="text-xs text-slate-500">{x.kod}{!!x.kod && !/İŞÇİLİK|ISCILIK|HİZMET/i.test(x.ad) && <> · <span className={st <= 0 ? 'font-semibold text-red-600' : ''}>{st <= 0 ? 'stok bitti' : `stok ${sayi(st)}`}</span></>}</div></td><td className="text-right">{sayi(x.adet)}</td><td className="text-right font-semibold">{para(x.ciro)}</td>{maliyetGor && <td className={`text-right ${x.maliyetsiz ? 'text-xs text-slate-400' : x.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{x.maliyetsiz ? 'maliyet yok' : para(x.kar)}</td>}</tr>; })}</tbody></table>)}
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold">Markalar</div>
            {ozet.markalar.length === 0 ? <Bos metin="Bu dönemde satış yok." /> : (
              <table className="tbl text-sm"><thead><tr><th>Marka</th><th className="text-right">Çeşit</th><th className="text-right">Adet</th><th className="text-right">Ciro</th>{maliyetGor && <th className="text-right">Kâr</th>}{maliyetGor && <th className="text-right">Marj</th>}</tr></thead>
                <tbody>{ozet.markalar.map((x) => { const net = x.ciro / 1.2; return <tr key={x.ad}><td className="font-medium">{x.ad}</td><td className="text-right">{sayi(x.cesit)}</td><td className="text-right">{sayi(x.adet)}</td><td className="text-right font-semibold">{para(x.ciro)}</td>{maliyetGor && <td className={`text-right ${x.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{para(x.kar)}</td>}{maliyetGor && <td className="text-right text-xs">{net > 0 ? `%${((x.kar / net) * 100).toFixed(0)}` : ''}</td>}</tr>; })}</tbody></table>)}
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold">En çok alan cariler {ozet.toplamCari > 0 && <span className="font-normal text-slate-500">· {sayi(ozet.toplamCari)} cari, {sayi(ozet.yeniCari)} tanesi ilk kez aldı</span>}</div>
            {ozet.cariler.length === 0 ? <Bos metin="Cari bilgisi olan satış yok." /> : (
              <table className="tbl text-sm"><thead><tr><th>Cari</th><th className="text-right">Fatura</th><th className="text-right">Ciro</th>{maliyetGor && <th className="text-right">Kâr</th>}</tr></thead>
                <tbody>{ozet.cariler.map((x) => <tr key={x.ad}><td><MusteriLink guid={x.guid} ad={x.ad} />{x.ilk && x.ilk >= d.bas && <span className="rozet ml-1 bg-sky-50 text-sky-700">yeni</span>}</td><td className="text-right">{sayi(x.belge)}</td><td className="text-right font-semibold">{para(x.ciro)}</td>{maliyetGor && <td className={`text-right ${x.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{para(x.kar)}</td>}</tr>)}</tbody></table>)}
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold">Satışı yapan kullanıcı</div>
            {ozet.kullanicilar.length === 0 ? <Bos metin="Bu dönemde satış yok." /> : (
              <table className="tbl text-sm"><thead><tr><th>Kullanıcı</th><th className="text-right">Fatura</th><th className="text-right">Ciro</th><th className="text-right">Ort. fatura</th>{maliyetGor && <th className="text-right">Kâr</th>}</tr></thead>
                <tbody>{ozet.kullanicilar.map((x) => <tr key={x.ad}><td className="font-medium">{x.ad}</td><td className="text-right">{sayi(x.belge)}</td><td className="text-right font-semibold">{para(x.ciro)}</td><td className="text-right text-xs">{x.belge ? para(x.ciro / x.belge) : ''}</td>{maliyetGor && <td className={`text-right ${x.kar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{para(x.kar)}</td>}</tr>)}</tbody></table>)}
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold">Kategoriler</div>
            {ozet.kategoriler.length === 0 ? <Bos metin="Bu dönemde satış yok." /> : (
              <table className="tbl text-sm"><thead><tr><th>Kategori</th><th className="text-right">Adet</th><th className="text-right">Ciro</th><th className="w-24" />{maliyetGor && <th className="text-right">Marj</th>}</tr></thead>
                <tbody>{ozet.kategoriler.map((x) => { const net = x.ciro / 1.2; const pay = top.ciro > 0 ? (x.ciro / top.ciro) * 100 : 0; return <tr key={x.ad}><td className="font-medium">{x.ad}</td><td className="text-right">{sayi(x.adet)}</td><td className="text-right font-semibold">{para(x.ciro)}</td><td><div className="h-1.5 rounded bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded bg-marka-500" style={{ width: `${Math.min(100, pay)}%` }} /></div><div className="text-[10px] text-slate-500">%{pay.toFixed(0)}</div></td>{maliyetGor && <td className={`text-right text-xs ${x.kar < 0 ? 'text-red-600' : ''}`}>{net > 0 ? `%${((x.kar / net) * 100).toFixed(0)}` : ''}</td>}</tr>; })}</tbody></table>)}
          </div>
          {maliyetGor && <div>
            <div className="mb-1 text-sm font-semibold">Alış yapılan tedarikçiler</div>
            {ozet.tedarikciler.length === 0 ? <Bos metin="Bu dönemde alış yok." /> : (
              <table className="tbl text-sm"><thead><tr><th>Tedarikçi</th><th className="text-right">Fatura</th><th className="text-right">Çeşit</th><th className="text-right">Adet</th><th className="text-right">Tutar</th></tr></thead>
                <tbody>{ozet.tedarikciler.map((x) => <tr key={x.ad}><td className="font-medium">{x.ad}</td><td className="text-right">{sayi(x.belge)}</td><td className="text-right">{sayi(x.cesit)}</td><td className="text-right">{sayi(x.adet)}</td><td className="text-right font-semibold">{para(x.tutar)}</td></tr>)}</tbody></table>)}
          </div>}
          <div className="lg:col-span-2">
            <div className="mb-1 text-sm font-semibold">Hangi gün, hangi saat satılıyor <span className="font-normal text-slate-500">(ciro; koyu = yoğun)</span></div>
            {(() => {
              const saatler = Array.from({ length: 24 }, (_, i) => i).filter((h) => ozet.sg.some((g) => g[h] > 0) || (h >= 8 && h <= 20));
              const mx = Math.max(1, ...ozet.sg.flat());
              const gunAd = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
              return (
                <div className="overflow-x-auto"><table className="text-[11px]"><thead><tr><th />{saatler.map((h) => <th key={h} className="px-0.5 font-normal text-slate-500">{String(h).padStart(2, '0')}</th>)}<th className="pl-2 text-right font-normal text-slate-500">Toplam</th></tr></thead>
                  <tbody>{ozet.sg.map((g, i) => <tr key={i}><td className="pr-2 text-slate-500">{gunAd[i]}</td>{saatler.map((h) => <td key={h} className="p-0.5"><div className="h-6 w-8 rounded-sm" style={{ background: g[h] > 0 ? `rgba(37,99,235,${0.12 + 0.88 * (g[h] / mx)})` : 'rgba(148,163,184,0.12)' }} title={`${gunAd[i]} ${String(h).padStart(2, '0')}:00 · ${para(g[h])}`} /></td>)}<td className="pl-2 text-right font-medium">{para(g.reduce((t, v) => t + v, 0))}</td></tr>)}</tbody></table></div>);
            })()}
          </div>
        </div>}
      </div>
    </div>
  );
}
