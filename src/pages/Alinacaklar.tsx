import { useMemo, useState } from 'react';
import { Download, Info, MessageCircle, Printer, Snowflake, Sun, Truck } from 'lucide-react';
import { useStore } from '../lib/store';
import { backend } from '../lib/backend';
import { alinacakHesap, takipGunu, urunOzetleri, type Donem } from '../lib/analiz';
import { ara, gunu, para, parse, sayi, tarih } from '../lib/format';
import type { Urun } from '../lib/types';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { yazdir } from '../components/Yazdir';
import { mevsim, urunTedarikcileri } from '../lib/analiz3';
import { UrunLink } from '../components/DetayKart';
import { muadilMetin, stoktakiMuadiller } from '../lib/muadil';

interface Satir { u: Urun; satilan: number; hiz: number; yeter: number; oneri: number; neden: 'kritik' | 'bitti' | 'azaliyor'; mevsim: { ad: string; katsayi: number } | null }

export default function Alinacaklar() {
  const { db, izin, calistir } = useStore();
  const maliyetGor = izin('maliyet'), duzenle = izin('urun');
  const [gunSec, setGunSec] = useState(30);
  const [q, setQ] = useState('');
  const [marka, setMarka] = useState('');
  const [kat, setKat] = useState('');
  const [miktar, setMiktar] = useState<Record<string, string>>({});
  const [cikar, setCikar] = useState<Set<string>>(new Set());
  const [grupla, setGrupla] = useState(false);
  const [mevsimAcik, setMevsimAcik] = useState(true);
  const ted = useMemo(() => urunTedarikcileri(db), [db]);
  const hedefGun = db.ayarlar.hedef_gun || 30;
  const d: Donem = { bas: gunu(new Date(Date.now() - (gunSec - 1) * 864e5)), bit: gunu() };
  const gun = takipGunu(db, d);

  const satirlar = useMemo<Satir[]>(() => {
    const oz = urunOzetleri(db, d);
    return db.urunler.filter((u) => u.aktif).flatMap((u) => {
      const satilan = oz.get(u.id)?.satilan ?? 0;
      const ms = mevsimAcik ? mevsim(u) : null;
      const h = alinacakHesap(u, satilan * (ms?.katsayi ?? 1), gun, hedefGun);
      const kritik = u.kritik_stok > 0 && u.stok <= u.kritik_stok;
      const bitti = u.stok <= 0 && satilan > 0;
      if (!kritik && !bitti && h.alinacak <= 0) return [];
      return [{ u, satilan, hiz: h.hiz, yeter: h.yeterGun, oneri: Math.max(h.alinacak, kritik ? Math.max(1, u.kritik_stok * 2 - Math.max(0, u.stok)) : 1), neden: kritik ? 'kritik' as const : bitti ? 'bitti' as const : 'azaliyor' as const, mevsim: ms && ms.katsayi !== 1 ? ms : null }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, gunSec, gun, hedefGun, mevsimAcik]);

  const markalar = useMemo(() => Array.from(new Set(satirlar.map((x) => x.u.marka).filter(Boolean))).sort() as string[], [satirlar]);
  const kategoriler = useMemo(() => Array.from(new Set(satirlar.map((x) => x.u.kategori).filter(Boolean))).sort() as string[], [satirlar]);
  const liste = satirlar.filter((x) => (!marka || x.u.marka === marka) && (!kat || x.u.kategori === kat) && ara(q, x.u.ad, x.u.kod, x.u.marka))
    .sort((a, b) => (a.yeter - b.yeter) || a.u.ad.localeCompare(b.u.ad, 'tr'));
  const adet = (x: Satir) => (miktar[x.u.id] !== undefined ? parse(miktar[x.u.id]) : x.oneri);
  const secili = liste.filter((x) => !cikar.has(x.u.id) && adet(x) > 0);
  const tutar = secili.reduce((t, x) => t + adet(x) * x.u.alis_fiyati, 0);

  const kritikKaydet = (u: Urun, v: string) => { const n = parse(v); if (n !== u.kritik_stok) calistir(() => backend.update<Urun>('urunler', u.id, { kritik_stok: n }), 'Kritik seviye kaydedildi'); };
  const metin = () => [`${db.ayarlar.firma_adi} — Sipariş listesi (${tarih(new Date().toISOString())})`, '',
    ...secili.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(adet(x))} ${x.u.birim}`), '', `Toplam ${secili.length} kalem`].join('\n');
  const tedAd = (x: Satir) => ted.get(x.u.id)?.ucuz.ad ?? 'Tedarikçi bilinmiyor';
  const gruplar = (() => { const m = new Map<string, Satir[]>(); for (const x of secili) { const k = tedAd(x); m.set(k, [...(m.get(k) ?? []), x]); } return [...m.entries()].sort((a, b) => Number(a[0] === 'Tedarikçi bilinmiyor') - Number(b[0] === 'Tedarikçi bilinmiyor') || b[1].length - a[1].length); })();
  const tedMetin = (ad: string, l: Satir[]) => [`Merhaba ${ad === "Tedarikçi bilinmiyor" ? "" : ad + ", "}${db.ayarlar.firma_adi} sipariş listesi (${tarih(new Date().toISOString())}):`, '', ...l.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(adet(x))} ${x.u.birim}`), '', `Toplam ${l.length} kalem. Teşekkürler.`].join('\n');
  const csv = () => {
    const sat = (a: (string | number | null | undefined)[]) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [sat(['Tedarikçi (en ucuz)', 'Stok kodu', 'Barkod', 'Ürün', 'Marka', 'Kategori', 'Stok', 'Kritik', `Son ${gunSec} gün satış`, 'Sipariş adedi', 'Birim', ...(maliyetGor ? ['Alış fiyatı', 'Tutar'] : [])]),
      ...[...secili].sort((a, b) => tedAd(a).localeCompare(tedAd(b), 'tr')).map((x) => sat([tedAd(x), x.u.kod, x.u.barkod, x.u.ad, x.u.marka, x.u.kategori, x.u.stok, x.u.kritik_stok, x.satilan, adet(x), x.u.birim, ...(maliyetGor ? [x.u.alis_fiyati, (adet(x) * x.u.alis_fiyati).toFixed(2)] : [])]))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); a.download = `siparis-${gunu()}.csv`; a.click();
  };
  const yazdirListe = () => yazdir(
    <div className="p-4 text-[11px]">
      <div className="mb-3 flex justify-between border-b-2 border-black pb-2"><b className="text-base">{db.ayarlar.firma_adi}</b><div className="text-right"><b>SİPARİŞ LİSTESİ</b><div>{tarih(new Date().toISOString())}</div></div></div>
      <table className="w-full border-collapse"><thead><tr className="border-b border-black text-left"><th>Kod</th><th>Ürün</th><th>Marka</th><th className="text-right">Stok</th><th className="text-right">Sipariş</th></tr></thead>
        <tbody>{secili.map((x) => <tr key={x.u.id} className="border-b"><td>{x.u.kod}</td><td>{x.u.ad}</td><td>{x.u.marka}</td><td className="text-right">{sayi(x.u.stok)}</td><td className="text-right font-bold">{sayi(adet(x))} {x.u.birim}</td></tr>)}</tbody></table>
      <div className="mt-2 text-right">{secili.length} kalem</div>
    </div>,
  );

  return (
    <div>
      <SayfaBaslik baslik="Kritik Stok & Alınacaklar" alt={`Satış hızına göre kaç adet almanız gerektiği · hedef: ${hedefGun} günlük stok`}>
        <button className="btn-ghost" disabled={!secili.length} onClick={yazdirListe}><Printer size={16} /> Yazdır</button>
        <button className="btn-ghost" disabled={!secili.length} onClick={csv}><Download size={16} /> Excel (CSV)</button>
        <a className={`btn-primary ${secili.length ? '' : 'pointer-events-none opacity-50'}`} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(secili.length ? metin() : '')}`}><MessageCircle size={16} /> WhatsApp</a>
      </SayfaBaslik>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket="Kritik seviyenin altında" deger={sayi(satirlar.filter((x) => x.neden === 'kritik').length)} renk="amber" />
        <Kpi etiket="Satılıp stoğu biten" deger={sayi(satirlar.filter((x) => x.neden === 'bitti').length)} renk="red" />
        <Kpi etiket={`${hedefGun} günden az yetecek`} deger={sayi(satirlar.filter((x) => x.neden === 'azaliyor').length)} />
        <Kpi etiket="Seçili sipariş" deger={`${secili.length} kalem`} alt={maliyetGor ? `Tahmini alış ${para(tutar)}` : undefined} renk="blue" />
      </div>
      <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>Önerilen adet = son {gunSec} günün günlük satışı × {hedefGun} gün − mevcut stok ({gun} günlük veriyle). "Mevsime göre ayarla" açıkken akü, antifriz, klima, silecek gibi mevsimlik ürünlerde satış hızı gelecek ayın beklenen talebine göre artırılır/azaltılır. Tedarikçi, son 6 ayın alış faturalarında bu ürünü en ucuza aldığınız firmadır. Kritik seviye tanımladığınız ürünler o seviyenin altına inince de listelenir; kritik seviyeyi tablodan değiştirebilirsiniz (BizimHesap'a yazılmaz).</span>
      </div>
      {grupla && secili.length > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gruplar.map(([ad, l]) => (
            <div key={ad} className="card p-4">
              <div className="mb-2 flex items-center justify-between gap-2"><b className="truncate">{ad}</b><span className="text-xs text-slate-500">{l.length} kalem{maliyetGor ? ` · ${para(l.reduce((t, x) => t + adet(x) * (ted.get(x.u.id)?.ucuz.fiyat ?? x.u.alis_fiyati), 0))}` : ''}</span></div>
              <ul className="mb-3 max-h-40 space-y-0.5 overflow-auto text-xs">{l.map((x) => <li key={x.u.id} className="flex justify-between gap-2"><span className="truncate">{x.u.ad}</span><b className="shrink-0">{sayi(adet(x))}</b></li>)}</ul>
              <a className="btn-ghost w-full" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(tedMetin(ad, l))}`}><MessageCircle size={15} /> WhatsApp sipariş metni</a>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <input className="inp max-w-xs" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="inp w-44" value={marka} onChange={(e) => setMarka(e.target.value)}><option value="">Tüm markalar</option>{markalar.map((m) => <option key={m}>{m}</option>)}</select>
          <select className="inp w-44" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Tüm kategoriler</option>{kategoriler.map((m) => <option key={m}>{m}</option>)}</select>
          <select className="inp w-44" value={gunSec} onChange={(e) => setGunSec(Number(e.target.value))}><option value={30}>Satış hızı: son 30 gün</option><option value={90}>Satış hızı: son 90 gün</option><option value={7}>Satış hızı: son 7 gün</option></select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={mevsimAcik} onChange={(e) => setMevsimAcik(e.target.checked)} /> Mevsime göre ayarla</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={grupla} onChange={(e) => setGrupla(e.target.checked)} /> <Truck size={14} /> Tedarikçiye göre grupla</label>
          <span className="ml-auto text-xs text-slate-500">{liste.length} ürün</span>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Alınması gereken ürün görünmüyor. Satış verisi biriktikçe veya kritik seviye tanımladıkça liste dolar." /> : (
            <table className="tbl">
              <thead><tr><th className="w-8"><input type="checkbox" checked={cikar.size === 0} onChange={(e) => setCikar(e.target.checked ? new Set() : new Set(liste.map((x) => x.u.id)))} /></th><th>Ürün</th><th className="text-right">Stok</th><th className="w-24 text-right">Kritik</th><th className="text-right">Son {gunSec} gün</th><th className="text-right">Yeter</th>{maliyetGor && <th className="text-right">Alış</th>}<th className="w-28 text-right">Sipariş</th></tr></thead>
              <tbody>{liste.map((x) => (
                <tr key={x.u.id} className={cikar.has(x.u.id) ? 'opacity-40' : ''}>
                  <td><input type="checkbox" checked={!cikar.has(x.u.id)} onChange={() => { const s = new Set(cikar); if (s.has(x.u.id)) s.delete(x.u.id); else s.add(x.u.id); setCikar(s); }} /></td>
                  <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div><div className="text-xs text-slate-500">{[x.u.kod, x.u.marka].filter(Boolean).join(' · ')}
                    {x.mevsim && <span className={`ml-1.5 rozet ${x.mevsim.katsayi > 1 ? 'bg-sky-50 text-sky-700' : 'bg-orange-50 text-orange-700'}`} title={`${x.mevsim.ad}: gelecek ay talep bu aya göre ×${x.mevsim.katsayi}`}>{x.mevsim.katsayi > 1 ? <Snowflake size={11} className="mr-0.5" /> : <Sun size={11} className="mr-0.5" />}{x.mevsim.ad} {x.mevsim.katsayi > 1 ? '↑' : '↓'}%{Math.round(Math.abs(x.mevsim.katsayi - 1) * 100)}</span>}
                    {ted.get(x.u.id) && <span className="ml-1.5 text-slate-400">· {ted.get(x.u.id)!.ucuz.ad}{maliyetGor ? ` ${para(ted.get(x.u.id)!.ucuz.fiyat)}` : ''}{ted.get(x.u.id)!.secenek > 1 ? ` (${ted.get(x.u.id)!.secenek} tedarikçi)` : ''}</span>}
                    {x.u.stok <= 0 && (() => { const m = stoktakiMuadiller(db, x.u); return m.length ? <span className="ml-1.5 rozet bg-emerald-50 text-emerald-700" title="BizimHesap etiketindeki OEM kodlarına göre">muadili stokta: {muadilMetin(m.slice(0, 2))}</span> : null; })()}
                    <span className={`ml-1.5 rozet ${x.neden === 'kritik' ? 'bg-amber-100 text-amber-800' : x.neden === 'bitti' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{x.neden === 'kritik' ? 'kritik seviye' : x.neden === 'bitti' ? 'stok bitti' : 'azalıyor'}</span></div></td>
                  <td className={`text-right font-medium ${x.u.stok <= 0 ? 'text-red-600' : 'text-amber-700'}`}>{sayi(x.u.stok)}</td>
                  <td>{duzenle ? <input className="inp py-1 text-right" defaultValue={x.u.kritik_stok || ''} placeholder="—" key={x.u.kritik_stok} onBlur={(e) => kritikKaydet(x.u, e.target.value)} /> : <div className="text-right">{x.u.kritik_stok || '—'}</div>}</td>
                  <td className="text-right text-slate-500">{sayi(x.satilan)}</td>
                  <td className={`text-right ${x.yeter < 7 ? 'text-red-600' : 'text-slate-500'}`}>{Number.isFinite(x.yeter) ? `${Math.round(x.yeter)} gün` : '—'}</td>
                  {maliyetGor && <td className="text-right text-slate-500">{para(x.u.alis_fiyati)}</td>}
                  <td><input className="inp py-1 text-right" value={miktar[x.u.id] ?? String(x.oneri)} onChange={(e) => setMiktar({ ...miktar, [x.u.id]: e.target.value })} onFocus={(e) => e.target.select()} /></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
