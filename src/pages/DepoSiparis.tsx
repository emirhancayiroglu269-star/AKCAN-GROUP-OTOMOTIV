import { useMemo, useState } from 'react';
import { ArrowLeftRight, Download, Info, MessageCircle, PackageX, Printer, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import { useStore } from '../lib/store';
import { depoSiparisleri, urunTedarikcileri, type DepoSiparisSatir } from '../lib/analiz3';
import { ara, gunu, para, parse, sayi, tarih } from '../lib/format';
import { UrunLink } from '../components/DetayKart';
import { Bos, Kpi, SayfaBaslik } from '../components/ui';
import { yazdir } from '../components/Yazdir';
import { muadilBulucu } from '../lib/muadil';
import { OmIsteDugme } from '../components/OmIsteDugme';
import { PahaliRozet } from '../components/PahaliRozet';

const kisa = (s: string) => s.replace(/ DEPO(SU)?$/i, '');

export default function DepoSiparis() {
  const { db, izin } = useStore(); const maliyetGor = izin('maliyet');
  const [gunSec, setGunSec] = useState(60);
  const [mevsimAcik, setMevsimAcik] = useState(true);
  const hedefGun = db.ayarlar.hedef_gun || 30;
  const depolar = useMemo(() => depoSiparisleri(db, gunSec, hedefGun, mevsimAcik), [db, gunSec, hedefGun, mevsimAcik]);
  const ted = useMemo(() => urunTedarikcileri(db), [db]);
  const [secili, setSecili] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [neden, setNeden] = useState<'' | 'bitti' | 'azaliyor'>('');
  const [grupla, setGrupla] = useState(false);
  const [adet, setAdet] = useState<Record<string, string>>({});
  const [cikar, setCikar] = useState<Set<string>>(new Set());
  const dp = depolar.find((x) => x.anahtar === secili) ?? depolar[0];
  // bu depoda stokta muadili (etiketteki OEM kodlarına göre) olan ürünler: sipariş varsayılanı 0
  const muadil = useMemo(() => {
    const m = new Map<string, { kod: string; adet: number }[]>(); if (!dp) return m;
    const depo = db.depolar.find((x) => x.aktif && x.ad === dp.ad); if (!depo) return m;
    const ds = new Map<string, number>(); for (const x of db.urun_depo_stok) if (x.depo_id === depo.id) ds.set(x.urun_id, Number(x.miktar) || 0);
    const bul = muadilBulucu(db);
    for (const x of dp.satirlar) { const l = bul(x.u).map((v) => ({ kod: v.kod || v.ad.slice(0, 20), adet: ds.get(v.id) ?? 0 })).filter((v) => v.adet > 0); if (l.length) m.set(x.u.id, l); }
    return m;
  }, [db, dp]);
  if (!dp) return <div><SayfaBaslik baslik="Depo Siparişleri" /><div className="card"><Bos metin="Depo bilgisi yok." /></div></div>;

  const anahtar = (x: DepoSiparisSatir) => `${dp.anahtar}|${x.u.id}`;
  const varsayilan = (x: DepoSiparisSatir) => { const md = muadil.get(x.u.id); return md && md.reduce((t, v) => t + v.adet, 0) >= x.ihtiyac ? 0 : x.siparis; };
  const sipAdet = (x: DepoSiparisSatir) => (adet[anahtar(x)] !== undefined ? parse(adet[anahtar(x)]) : varsayilan(x));
  const liste = dp.satirlar.filter((x) => (!neden || x.neden === neden) && ara(q, x.u.ad, x.u.kod, x.u.marka, x.u.kategori));
  const siparisListe = liste.filter((x) => !cikar.has(anahtar(x)) && sipAdet(x) > 0);
  const transferListe = liste.filter((x) => x.transfer > 0);
  const tutar = siparisListe.reduce((t, x) => t + sipAdet(x) * (ted.get(x.u.id)?.ucuz.fiyat ?? x.u.alis_fiyati), 0);
  const tedAd = (x: DepoSiparisSatir) => ted.get(x.u.id)?.ucuz.ad ?? 'Tedarikçi bilinmiyor';
  const gruplar = (() => { const m = new Map<string, DepoSiparisSatir[]>(); for (const x of siparisListe) m.set(tedAd(x), [...(m.get(tedAd(x)) ?? []), x]); return [...m.entries()].sort((a, b) => Number(a[0] === 'Tedarikçi bilinmiyor') - Number(b[0] === 'Tedarikçi bilinmiyor') || b[1].length - a[1].length); })();
  const baslik = `${kisa(dp.ad)} DEPO SİPARİŞİ`;
  const metin = (l: DepoSiparisSatir[], tedarikci?: string) => [tedarikci && tedarikci !== 'Tedarikçi bilinmiyor' ? `Merhaba ${tedarikci},` : '', `${db.ayarlar.firma_adi} — ${baslik} (${tarih(new Date().toISOString())})`, `Teslimat: ${dp.ad}`, '',
    ...l.map((x) => `• ${x.u.ad}${x.u.marka ? ` (${x.u.marka})` : ''}${x.u.kod ? ` [${x.u.kod}]` : ''} — ${sayi(sipAdet(x))} ${x.u.birim}`), '', `Toplam ${l.length} kalem`].filter((s, i) => s !== '' || i > 0).join('\n');
  const transferMetin = () => [`${db.ayarlar.firma_adi} — ${kisa(dp.ad)} için depo transferi (${tarih(new Date().toISOString())})`, '',
    ...transferListe.map((x) => `• ${x.u.ad}${x.u.kod ? ` [${x.u.kod}]` : ''}: ${sayi(x.transfer)} ${x.u.birim} ← ${x.digerStok.filter((o) => o.fazla > 0).map((o) => kisa(o.ad)).join(', ')}`)].join('\n');
  const csv = () => {
    const s = (a: (string | number | null | undefined)[]) => a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    const icerik = [s(['Depo', 'Tedarikçi (en ucuz)', 'Stok kodu', 'Barkod', 'Ürün', 'Marka', 'Bu depoda stok', 'Diğer depolarda', `${gunSec} günde bu depoda satış`, 'Transferle gelecek', 'Sipariş adedi', ...(maliyetGor ? ['Birim alış', 'Tutar'] : [])]),
      ...siparisListe.map((x) => { const f = ted.get(x.u.id)?.ucuz.fiyat ?? x.u.alis_fiyati; return s([dp.ad, tedAd(x), x.u.kod, x.u.barkod, x.u.ad, x.u.marka, x.stok, x.digerStok.map((o) => `${kisa(o.ad)}: ${o.stok}`).join(' / '), x.satilan, x.transfer, sipAdet(x), ...(maliyetGor ? [f.toFixed(2), (f * sipAdet(x)).toFixed(2)] : [])]); })].join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['﻿' + icerik], { type: 'text/csv' })); el.download = `siparis-${kisa(dp.ad).toLowerCase()}-${gunu()}.csv`; el.click();
  };
  const bas = () => yazdir(
    <div className="p-4 text-[11px]">
      <div className="mb-3 flex justify-between border-b-2 border-black pb-2"><b className="text-base">{db.ayarlar.firma_adi}</b><div className="text-right"><b>{baslik}</b><div>{tarih(new Date().toISOString())}</div></div></div>
      <table className="w-full border-collapse"><thead><tr className="border-b border-black text-left"><th>Tedarikçi</th><th>Kod</th><th>Ürün</th><th>Marka</th><th className="text-right">Depoda</th><th className="text-right">Sipariş</th></tr></thead>
        <tbody>{[...siparisListe].sort((a, b) => tedAd(a).localeCompare(tedAd(b), 'tr')).map((x) => <tr key={x.u.id} className="border-b"><td>{tedAd(x)}</td><td>{x.u.kod}</td><td>{x.u.ad}</td><td>{x.u.marka}</td><td className="text-right">{sayi(x.stok)}</td><td className="text-right font-bold">{sayi(sipAdet(x))} {x.u.birim}</td></tr>)}</tbody></table>
      <div className="mt-2 text-right">{siparisListe.length} kalem</div>
    </div>,
  );

  return (
    <div>
      <SayfaBaslik baslik="Depo Siparişleri" alt={`Her depo kendi stoğu ve kendi satışına göre: hangi depoda biterse o deponun siparişine düşer · hedef ${hedefGun} günlük stok`}>
        <OmIsteDugme urunler={liste.filter((x) => x.neden === 'bitti').map((x) => x.u)} />
        <button className="btn-ghost" disabled={!siparisListe.length} onClick={bas}><Printer size={16} /> Yazdır</button>
        <button className="btn-ghost" disabled={!siparisListe.length} onClick={csv}><Download size={16} /> CSV</button>
        <a className={`btn-primary ${siparisListe.length ? '' : 'pointer-events-none opacity-50'}`} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(metin(siparisListe))}`}><MessageCircle size={16} /> WhatsApp</a>
      </SayfaBaslik>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {depolar.map((d) => {
          const bitti = d.satirlar.filter((x) => x.neden === 'bitti').length, sip = d.satirlar.filter((x) => x.siparis > 0), tr = d.satirlar.filter((x) => x.transfer > 0).length;
          return (
            <button key={d.anahtar} onClick={() => { setSecili(d.anahtar); setCikar(new Set()); }} className={`card p-4 text-left transition ${dp.anahtar === d.anahtar ? 'border-marka-500 ring-2 ring-marka-500' : 'hover:border-slate-400'}`}>
              <div className="mb-2 flex items-center gap-2 font-semibold"><Warehouse size={18} className="text-marka-600" /> {d.ad}</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><div className="text-xs text-slate-500">Stokta biten</div><div className="text-lg font-bold text-red-600">{sayi(bitti)}</div></div>
                <div><div className="text-xs text-slate-500">Sipariş edilecek</div><div className="text-lg font-bold">{sayi(sip.length)}</div></div>
                <div><div className="text-xs text-slate-500">Diğer depodan</div><div className="text-lg font-bold text-sky-700">{sayi(tr)}</div></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiket={`${kisa(dp.ad)}: stokta biten`} deger={sayi(dp.satirlar.filter((x) => x.neden === 'bitti').length)} alt="Bu depoda satılmış, şu an 0" renk="red" ikon={<PackageX size={16} />} />
        <Kpi etiket={`${hedefGun} günden az yetecek`} deger={sayi(dp.satirlar.filter((x) => x.neden === 'azaliyor').length)} alt="Bu deponun satış hızına göre" renk="amber" />
        <Kpi etiket="Diğer depodan getirilebilecek" deger={sayi(transferListe.length)} alt="Önce transfer, kalanı sipariş" renk="blue" ikon={<ArrowLeftRight size={16} />} />
        <Kpi etiket="Seçili sipariş" deger={`${siparisListe.length} kalem`} alt={maliyetGor ? `Tahmini ${para(tutar)}` : undefined} ikon={<ShoppingCart size={16} />} />
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <b className="text-sm">{baslik}</b>
          <input className="inp max-w-[220px]" placeholder="Ürün, kod, marka…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="inp w-auto" value={neden} onChange={(e) => setNeden(e.target.value as typeof neden)}><option value="">Biten + azalan</option><option value="bitti">Sadece bitenler</option><option value="azaliyor">Sadece azalanlar</option></select>
          <select className="inp w-auto" value={gunSec} onChange={(e) => setGunSec(Number(e.target.value))}><option value={30}>Satış hızı: son 30 gün</option><option value={60}>Satış hızı: son 60 gün</option><option value={90}>Satış hızı: son 90 gün</option></select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={mevsimAcik} onChange={(e) => setMevsimAcik(e.target.checked)} /> Mevsime göre</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={grupla} onChange={(e) => setGrupla(e.target.checked)} /> <Truck size={14} /> Tedarikçiye göre</label>
          <span className="ml-auto text-xs text-slate-500">{liste.length} ürün</span>
        </div>
        {grupla && siparisListe.length > 0 && (
          <div className="grid gap-3 border-b border-slate-200 p-3 md:grid-cols-2 xl:grid-cols-3 dark:border-slate-800">
            {gruplar.map(([ad, l]) => (
              <div key={ad} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex justify-between gap-2"><b className="truncate">{ad}</b><span className="shrink-0 text-xs text-slate-500">{l.length} kalem</span></div>
                <ul className="mb-2 max-h-32 space-y-0.5 overflow-auto text-xs">{l.map((x) => <li key={x.u.id} className="flex justify-between gap-2"><span className="truncate">{x.u.ad}</span><b>{sayi(sipAdet(x))}</b></li>)}</ul>
                <a className="btn-ghost w-full text-xs" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(metin(l, ad))}`}><MessageCircle size={14} /> {kisa(dp.ad)} siparişi gönder</a>
              </div>
            ))}
          </div>
        )}
        <div className="max-h-[60vh] overflow-auto">
          {liste.length === 0 ? <Bos metin="Bu depoda biten veya azalan ürün yok." /> : (
            <table className="tbl">
              <thead><tr><th className="w-8"><input type="checkbox" checked={liste.every((x) => !cikar.has(anahtar(x)))} onChange={(e) => setCikar(e.target.checked ? new Set() : new Set(liste.map(anahtar)))} /></th><th>Ürün</th><th className="text-right">Bu depoda</th><th className="text-right">Diğer depo</th><th className="text-right">{gunSec} günde satış</th><th className="text-right">Yeter</th><th className="text-right">Transfer</th><th className="w-24 text-right">Sipariş</th></tr></thead>
              <tbody>{liste.slice(0, 600).map((x) => {
                const k = anahtar(x); const t = ted.get(x.u.id);
                return (
                  <tr key={k} className={cikar.has(k) ? 'opacity-40' : ''}>
                    <td><input type="checkbox" checked={!cikar.has(k)} onChange={() => { const s = new Set(cikar); if (s.has(k)) s.delete(k); else s.add(k); setCikar(s); }} /></td>
                    <td><div className="font-medium"><UrunLink id={x.u.id}>{x.u.ad}</UrunLink></div>
                      <div className="text-xs text-slate-500">{[x.u.kod, x.u.marka].filter(Boolean).join(' · ')}
                        <span className={`ml-1.5 rozet ${x.neden === 'bitti' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>{x.neden === 'bitti' ? 'bu depoda bitti' : 'azalıyor'}</span>
                        {x.mevsim && <span className="ml-1 rozet bg-sky-50 text-sky-700">{x.mevsim.ad} {x.mevsim.katsayi > 1 ? '↑' : '↓'}</span>}
                        {muadil.get(x.u.id) && <span className="ml-1 rozet bg-emerald-50 text-emerald-700" title="Etiketteki OEM kodlarına göre aynı parça">muadili bu depoda: {muadil.get(x.u.id)!.map((v) => `${v.kod} (${sayi(v.adet)})`).join(', ')}</span>}
                        {t && <span className="ml-1.5 text-slate-400">· {t.ucuz.ad}{maliyetGor ? ` ${para(t.ucuz.fiyat)}` : ''}</span>}<PahaliRozet t={t} maliyet={maliyetGor} /></div></td>
                    <td className={`text-right font-semibold ${x.stok <= 0 ? 'text-red-600' : 'text-amber-700'}`}>{sayi(x.stok)}</td>
                    <td className="text-right text-xs">{x.digerStok.map((o) => <div key={o.ad} className={o.fazla > 0 ? 'font-semibold text-sky-700' : 'text-slate-500'}>{kisa(o.ad)}: {sayi(o.stok)}</div>)}</td>
                    <td className="text-right text-slate-500">{sayi(x.satilan)}</td>
                    <td className={`text-right ${x.yeterGun < 7 ? 'text-red-600' : 'text-slate-500'}`}>{x.stok <= 0 ? '—' : Number.isFinite(x.yeterGun) ? `${Math.round(x.yeterGun)} gün` : '—'}</td>
                    <td className="text-right">{x.transfer > 0 ? <span className="font-semibold text-sky-700">{sayi(x.transfer)}</span> : <span className="text-slate-300">—</span>}</td>
                    <td><input className="inp py-1 text-right" value={adet[k] ?? String(varsayilan(x))} onChange={(e) => setAdet({ ...adet, [k]: e.target.value })} onFocus={(e) => e.target.select()} /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>

      {transferListe.length > 0 && (
        <div className="card mb-4 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2"><ArrowLeftRight size={18} className="text-sky-600" /><b>{kisa(dp.ad)} için diğer depodan getirilecekler</b><span className="text-xs text-slate-500">{transferListe.length} ürün — siparişten düşüldü</span>
            <a className="btn-ghost ml-auto text-xs" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(transferMetin())}`}><MessageCircle size={14} /> Transfer listesi</a></div>
          <div className="flex flex-wrap gap-1.5 text-xs">{transferListe.slice(0, 60).map((x) => <span key={x.u.id} className="rozet bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200">{x.u.ad.slice(0, 40)} × {sayi(x.transfer)}</span>)}</div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Info size={15} className="mt-0.5 shrink-0" /><span>Her depo ayrı hesaplanır: o depoda satılan adet (faturadaki depo bilgisine göre) → günlük satış hızı × {hedefGun} gün = o deponun hedef stoğu. Hedefin altına inen ya da sıfırlanan ürün o deponun listesine düşer. Diğer depoda kendi {hedefGun} günlük ihtiyacından fazlası varsa o kadarı "Transfer" sütununa yazılır ve siparişten düşülür; kalanı sipariş edilir. Seçilen dönemde bu depoda tek faturada satılan ürünler (kritik stok tanımlı değilse) ve işçilik/hizmet kalemleri listelenmez. Bu depoda stokta muadili olan ürünlerin sipariş adedi 0 gelir; isterseniz değiştirin. Depo seçilmeden kesilen faturalar hesaba katılmaz. Depo stokları BizimHesap'tan 3 dakikada bir gelir.</span>
      </div>
    </div>
  );
}
